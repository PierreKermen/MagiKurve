/* optimizer.js — Mana base generation and scoring
   Uses Karsten requirements + a pool of available lands to
   produce optimised combinations via the CP-SAT bridge. */

const SCRYFALL_DELAY_MS = 80;

/* ── Scryfall card fetch (for spell mana costs) ── */
async function fetchCardData(cardName) {
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.card_faces && d.card_faces[0].mana_cost) {
      return { ...d, mana_cost: d.card_faces[0].mana_cost, cmc: d.cmc };
    }
    return d;
  } catch {
    return null;
  }
}

/* ── Compute mana sources provided by fixed lands ── */
function computeFixedSources(fixedLands) {
  const sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  let totalCount = 0;
  for (const { qty, land } of fixedLands) {
    totalCount += qty;
    for (const c of land.colors) {
      sources[c] += qty;
    }
  }
  return { sources, totalCount };
}

/* ── Score a mana base (0–100) ── */
function scoreManaBase(sources, requirements, totalLands) {
  const activeColors = ["W", "U", "B", "R", "G"].filter(
    (c) => requirements[c] > 0,
  );
  if (activeColors.length === 0) return 0;

  let score = 100;
  for (const c of activeColors) {
    const ratio = sources[c] / requirements[c];
    if (ratio < 1) {
      score -= (1 - ratio) * 45;
    } else {
      score += Math.min((ratio - 1) * 4, 4);
    }
  }
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/* ── JS fallback greedy builder ── */
function buildManaBase(availableLands, requirements, totalLands, strategy) {
  const activeColors = ["W", "U", "B", "R", "G"].filter(
    (c) => requirements[c] > 0,
  );
  const allocation = {};
  const remaining = { lands: totalLands };
  const targets = Object.fromEntries(
    activeColors.map((c) => [c, requirements[c]]),
  );
  const sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  const sorted = [...availableLands].sort((a, b) => {
    if (strategy.preferUntapped) {
      if (a.untapped !== b.untapped) return b.untapped ? 1 : -1;
    }
    const aVal = a.colors.reduce((s, c) => s + Math.max(0, targets[c] || 0), 0);
    const bVal = b.colors.reduce((s, c) => s + Math.max(0, targets[c] || 0), 0);
    if (bVal !== aVal) return bVal - aVal;
    return a.colors.length - b.colors.length;
  });

  for (const land of sorted) {
    if (remaining.lands <= 0) break;
    const deficit = land.colors.reduce((max, c) => {
      return Math.max(max, Math.max(0, (targets[c] || 0) - sources[c]));
    }, 0);
    if (deficit <= 0) continue;

    const count = Math.min(4, remaining.lands, Math.ceil(deficit));
    if (count <= 0) continue;

    allocation[land.name] = count;
    for (const c of land.colors) sources[c] += count;
    remaining.lands -= count;
  }

  return { allocation, sources };
}

/* ── CP-SAT bridge call ── */
async function CPManaBase(availableLands, requirements, totalLands, strategy, fixedSources) {
  try {
    const response = await fetch("http://localhost:8000/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        available_lands: availableLands,
        requirements: requirements,
        total_lands: totalLands,
        strategy: strategy,
        fixed_sources: fixedSources || { W: 0, U: 0, B: 0, R: 0, G: 0 },
      }),
    });
    if (!response.ok) throw new Error("Python bridge error " + response.status);
    const data = await response.json();
    return { ...data, isFallback: false };
  } catch (e) {
    const fallback = buildManaBase(availableLands, requirements, totalLands, strategy);
    return { ...fallback, isFallback: true };
  }
}

/* ── Entry point: generate N ranked mana bases ── */
async function generateManaBases(availableLands, requirements, totalLands, fixedSources, n = 3) {
  const strategies = [
    { name: "Balanced", preferUntapped: false },
    { name: "Aggro (untapped)", preferUntapped: true },
    { name: "Value (tapped ok)", preferUntapped: false },
  ];

  const resultsPromises = strategies.slice(0, n).map(async (strat) => {
    try {
      const result = await CPManaBase(
        availableLands,
        requirements,
        totalLands,
        strat,
        fixedSources,
      );

      if (!result || result.error || !result.sources) {
        const fallback = buildManaBase(availableLands, requirements, totalLands, strat);
        const score = scoreManaBase(fallback.sources, requirements, totalLands);
        return { name: strat.name, ...fallback, score, isFallback: true };
      }

      const score = scoreManaBase(result.sources, requirements, totalLands);
      return { name: strat.name, ...result, score };
    } catch (e) {
      const fallback = buildManaBase(availableLands, requirements, totalLands, strat);
      const score = scoreManaBase(fallback.sources, requirements, totalLands);
      return { name: strat.name, ...fallback, score, isFallback: true };
    }
  });

  const results = await Promise.all(resultsPromises);
  return results.sort((a, b) => b.score - a.score);
}
