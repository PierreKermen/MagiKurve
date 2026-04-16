/* optimizer.js — Génération et classement des mana bases
   Prend les requirements Karsten et un pool de lands disponibles,
   produit N combinaisons optimisées. */

const SCRYFALL_DELAY_MS = 80; // respecter le rate limit Scryfall

/* ── Parsing de la decklist ──
   Formats supportés :
   - "4 Lightning Helix"
   - "4x Lightning Helix"
   - "4 Lightning Helix (MKM) 426"
   - "4x Lightning Helix (MKM) 426 *F*"
   - "4 Ashling, Rekindled // Ashling, Rimebound (ECL) 290"
   Les doublons (même nom) sont fusionnés.
*/
function parseDecklist(text) {
  const cardMap = new Map();
  const basicNames = new Set([
    "plains",
    "island",
    "swamp",
    "mountain",
    "forest",
  ]);
  const knownLandIds = new Set(ALL_LANDS.map((l) => l.name.toLowerCase()));

  for (const raw of text.trim().split("\n")) {
    let line = raw.trim();
    if (!line || line === "") continue;
    if (/^(deck|sideboard|commander|companion)$/i.test(line)) continue;
    if (line.startsWith("//")) continue;

    // Supprimer le flag foil (*F*, *f*, etc.)
    line = line.replace(/\s*\*\w+\*\s*$/, "").trim();

    // Regex : quantité (avec ou sans "x") + nom + (optionnel) code set + numéro
    const m = line.match(/^(\d+)x?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/i);
    if (!m) continue;

    const qty = parseInt(m[1], 10);
    let name = m[2].trim();

    // Cartes double-face : garder seulement le face avant
    if (name.includes(" // ")) {
      name = name.split(" // ")[0].trim();
    }

    if (basicNames.has(name.toLowerCase())) continue;
    if (knownLandIds.has(name.toLowerCase())) continue;

    cardMap.set(name, (cardMap.get(name) || 0) + qty);
  }

  return Array.from(cardMap.entries()).map(([name, qty]) => ({ name, qty }));
}

/* ── Appel Scryfall ── */
async function fetchCardData(cardName) {
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    // Pour les MDFC (double face), utiliser le face avant
    if (d.card_faces && d.card_faces[0].mana_cost) {
      return { ...d, mana_cost: d.card_faces[0].mana_cost, cmc: d.cmc };
    }
    return d;
  } catch {
    return null;
  }
}

/* ── Filtrer les lands disponibles selon les couleurs actives ── */
function getAvailableLands(requirements, selectedTypes) {
  const activeColors = new Set(
    Object.entries(requirements)
      .filter(([, v]) => v > 0)
      .map(([c]) => c),
  );
  if (activeColors.size === 0) return [];

  return ALL_LANDS.filter((land) => {
    if (!selectedTypes.has(land.type)) return false;
    if (land.type === "basicland") return activeColors.has(land.colors[0]);
    return land.colors.some((c) => activeColors.has(c));
  });
}

/* ── Calcul des sources fournies par une allocation ── */
function computeSources(allocation) {
    //TODO: confirm usage
  const sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const [id, count] of Object.entries(allocation)) {
    const land = ALL_LANDS.find((l) => l.id === id);
    if (!land || count <= 0) continue;
    for (const c of land.colors) sources[c] += count;
  }
  return sources;
}

/* ── Score d'une mana base (0–100) ── */
function scoreManaBase(sources, requirements, totalLands) {
  const activeColors = ["W", "U", "B", "R", "G"].filter(
    (c) => requirements[c] > 0,
  );
  if (activeColors.length === 0) return 0;

  let score = 100;
  for (const c of activeColors) {
    const ratio = sources[c] / requirements[c];
    if (ratio < 1) {
      // Pénalité : chaque % manquant coûte des points
      score -= (1 - ratio) * 45;
    } else {
      // Bonus léger pour les surplus
      score += Math.min((ratio - 1) * 4, 4);
    }
  }
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/* ── Générateur d'une mana base selon une stratégie ── */
function buildManaBase(availableLands, requirements, totalLands, strategy) {
  const activeColors = ["W", "U", "B", "R", "G"].filter(
    (c) => requirements[c] > 0,
  );
  const allocation = {};
  const remaining = { lands: totalLands };

  // Copie mutable des cibles
  const targets = Object.fromEntries(
    activeColors.map((c) => [c, requirements[c]]),
  );
  const sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  // Trier les lands selon la stratégie
  const sorted = [...availableLands].sort((a, b) => {
    // Priorité 1 : untapped si stratégie aggro
    if (strategy.preferUntapped) {
      if (a.untapped !== b.untapped) return b.untapped ? 1 : -1;
    }
    // Priorité 2 : triomes en tête si stratégie triome
    if (strategy.preferTriome) {
      if (a.type === "triome" && b.type !== "triome") return -1;
      if (b.type === "triome" && a.type !== "triome") return 1;
    }
    // Priorité 3 : score combiné (somme des déficits couverts)
    const aVal = a.colors.reduce((s, c) => s + Math.max(0, targets[c] || 0), 0);
    const bVal = b.colors.reduce((s, c) => s + Math.max(0, targets[c] || 0), 0);
    // Secondaire : préférer les lands qui couvrent MOINS de couleurs (plus efficaces)
    if (bVal !== aVal) return bVal - aVal;
    return a.colors.length - b.colors.length;
  });

  // Phase 1 : remplir les besoins couleur par couleur
  for (const land of sorted) {
    if (remaining.lands <= 0) break;

    // Combien ce land aide-t-il à couvrir les déficits ?
    const deficit = land.colors.reduce((max, c) => {
      return Math.max(max, Math.max(0, (targets[c] || 0) - sources[c]));
    }, 0);

    if (deficit <= 0) continue;

    const count = Math.min(4, remaining.lands, Math.ceil(deficit));
    if (count <= 0) continue;

    allocation[land.id] = count;
    for (const c of land.colors) sources[c] += count;
    remaining.lands -= count;
  }

  // Phase 2 : remplir le reste avec des basics de la couleur principale
  if (remaining.lands > 0) {
    const mainColor = activeColors.reduce((a, b) =>
      requirements[a] >= requirements[b] ? a : b,
    );
    const basicId = `basic-${colorToBasicId(mainColor)}`;
    if (availableLands.find((l) => l.id === basicId)) {
      allocation[basicId] = (allocation[basicId] || 0) + remaining.lands;
      sources[mainColor] = (sources[mainColor] || 0) + remaining.lands;
      remaining.lands = 0;
    } else {
      // Fallback : prendre n'importe quel basic disponible
      const anyBasic = availableLands.find((l) => l.type === "basicland");
      if (anyBasic) {
        allocation[anyBasic.id] =
          (allocation[anyBasic.id] || 0) + remaining.lands;
        for (const c of anyBasic.colors) sources[c] += remaining.lands;
        remaining.lands = 0;
      }
    }
  }

  return { allocation, sources };
}

function colorToBasicId(color) {
  return (
    { W: "plains", U: "island", B: "swamp", R: "mountain", G: "forest" }[
      color
    ] || "plains"
  );
}

/* ── CPManaBase (Appel au pont Python) ── */
async function CPManaBase(availableLands, requirements, totalLands, strategy) {
  try {
    const response = await fetch("http://localhost:8000/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        available_lands: availableLands,
        requirements: requirements,
        total_lands: totalLands,
        strategy: strategy,
      }),
    });
    if (!response.ok) throw new Error("Erreur lors de l'appel Python");
    return await response.json();
  } catch (e) {
    console.error("Python bridge failed, falling back to JS:", e);
    return buildManaBase(availableLands, requirements, totalLands, strategy);
  }
}

/* ── Point d'entrée : génère N mana bases classées ── */
function generateManaBases(availableLands, requirements, totalLands, n = 3) {
  const strategies = [
    { name: "Équilibrée", preferUntapped: false, preferTriome: false },
    { name: "Aggro (untapped)", preferUntapped: true, preferTriome: false },
    { name: "Triome-first", preferUntapped: false, preferTriome: true },
  ];

  const results = strategies.slice(0, n).map(async (strat) => {
      const {allocation, sources} = await CPManaBase(
          availableLands,
          requirements,
          totalLands,
          strat,
      );
      const score = scoreManaBase(sources, requirements, totalLands);
      return {name: strat.name, allocation, sources, score};
  });

  return results.sort((a, b) => b.score - a.score);
}
