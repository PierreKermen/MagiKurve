/* data.js — ManaKurve · Base de données des lands
 *
 * Source  : Scryfall API (unique=oracle → 1 entrée par carte unique)
 * Cache   : localStorage, TTL 7 jours (clé mk_lands_v1)
 *
 * ── Champ `legal` : masque binaire ────────────────────────────────────────
 *  Ordre fixe des bits (bit 0 = LSB) :
 *
 *   Bit │ Valeur │ Format
 *  ─────┼────────┼───────────
 *     0 │      1 │ standard
 *     1 │      2 │ pioneer
 *     2 │      4 │ modern
 *     3 │      8 │ legacy
 *     4 │     16 │ vintage
 *     5 │     32 │ commander
 *     6 │     64 │ pauper
 *     7 │    128 │ explorer
 *     8 │    256 │ historic
 *     9 │    512 │ alchemy
 *    10 │   1024 │ brawl
 *
 *  Exemple : Hallowed Fountain → standard(1) + pioneer(2) + modern(4) + … = 55
 *
 *  Tester la légalité :  isLegalIn(land.legal, 'standard')
 *  Ou directement :      land.legal & FORMAT_MASK.standard
 * ──────────────────────────────────────────────────────────────────────────
 */

var COLOR_NAMES = {
  W: "Blanc",
  U: "Bleu",
  B: "Noir",
  R: "Rouge",
  G: "Vert",
};

var TYPE_LABELS = {
  basicland: "Basics",
  fetchland: "Fetch Lands",
  shockland: "Shock Lands",
  checkland: "Check Lands",
  fastland: "Fast Lands",
  slowland: "Slow Lands",
  gainland: "Gain Lands",
  scryingland: "Scry Lands",
  triome: "Tri-Lands",
  dualland: "Dual / Pathway Lands",
  tapland: "Tap Lands",
  other: "Other Lands",
};

var LAND_TYPE_NAMES = TYPE_LABELS;


// ── Ordre canonique des formats ─────────────────────────────────────────────
const FORMAT_BITS = [
  "standard", // bit 0  —     1
  "pioneer", // bit 1  —     2
  "modern", // bit 2  —     4
  "legacy", // bit 3  —     8
  "vintage", // bit 4  —    16
  "commander", // bit 5  —    32
  "pauper", // bit 6  —    64
  "explorer", // bit 7  —   128
  "historic", // bit 8  —   256
  "alchemy", // bit 9  —   512
  "brawl", // bit 10 —  1024
];

// Raccourcis pratiques : FORMAT_MASK.standard, FORMAT_MASK.modern, …
const FORMAT_MASK = Object.fromEntries(FORMAT_BITS.map((f, i) => [f, 1 << i]));
const FORMAT_MASK_ALL = (1 << FORMAT_BITS.length) - 1; // 2047 = tous légaux

// ── Helpers légalité ─────────────────────────────────────────────────────────

function legalityToMask(legalities) {
  if (!legalities) return 0;
  let mask = 0;
  for (let i = 0; i < FORMAT_BITS.length; i++) {
    const s = legalities[FORMAT_BITS[i]];
    if (s === "legal" || s === "restricted") mask |= 1 << i;
  }
  return mask;
}

// Vérifie si un land est légal dans un format donné
function isLegalIn(legalMask, format) {
  const i = FORMAT_BITS.indexOf(format);
  return i >= 0 && !!(legalMask & (1 << i));
}

// ── Classification heuristique des types de lands ─────────────────────────────

function classifyLand(oracleText, typeLine) {
  const o = (oracleText || "").toLowerCase();
  const t = (typeLine || "").toLowerCase();

  if (t.includes("basic land")) return "basicland";
  if (o.includes("search your library") && o.includes("sacrifice"))
    return "fetchland";

  // Shock lands : paient 2 vies OU entrent dégagées sans coût
  if (o.includes("pay 2 life")) return "shockland";

  // Check lands : entrent engagées à moins de contrôler un certain type de base
  if (
    o.includes("enters the battlefield tapped unless") &&
    /plains|island|swamp|mountain|forest/.test(o)
  )
    return "checkland";

  // Fast lands : entrent dégagées si ≤ 2 autres terres
  if (
    o.includes("enters the battlefield tapped unless") &&
    o.includes("two or fewer other lands")
  )
    return "fastland";

  // Slow / reveal lands : variantes conditionnelles
  if (
    o.includes("enters the battlefield tapped unless") &&
    o.includes("reveal")
  )
    return "slowland";

  // Gain lands : entrent engagées + gain de vie
  if (
    o.includes("enters the battlefield tapped") &&
    o.includes("you gain 1 life")
  )
    return "gainland";

  // Scry lands : entrent engagées + scry
  if (o.includes("enters the battlefield tapped") && o.includes("scry"))
    return "scryingland";

  // MDFC / pathway : entrent toujours dégagées (pas de "enters tapped")
  if (
    !o.includes("enters the battlefield tapped") &&
    !o.includes("enters tapped") &&
    o.includes("{t}: add {")
  )
    return "dualland";

  // Triomes / tri-lands
  if (
    o.includes("cycling") &&
    t.includes("land") &&
    o.includes("enters the battlefield tapped")
  )
    return "triome";

  // Tout le reste : engagé sans condition
  if (
    o.includes("enters the battlefield tapped") ||
    o.includes("enters tapped")
  )
    return "tapland";

  return "other";
}

function extractColors(card) {
  // produced_mana est la source la plus fiable
  if (Array.isArray(card.produced_mana)) {
    const c = card.produced_mana.filter((x) => "WUBRG".includes(x));
    if (c.length > 0) return c;
  }
  // Fallback : color_identity
  return (card.color_identity || []).filter((x) => "WUBRG".includes(x));
}

function isUntapped(oracleText) {
  const o = (oracleText || "").toLowerCase();
  const tapped =
    o.includes("enters the battlefield tapped") || o.includes("enters tapped");
  if (!tapped) return true;
  // Conditionnelle → PEUT entrer dégagée
  if (o.includes("unless")) return true;
  return false;
}

// ── Scryfall fetch paginé ─────────────────────────────────────────────────────

const _SCRYFALL_QUERY =
  "https://api.scryfall.com/cards/search" +
  "?q=type%3Aland+not%3Adigital+not%3Atoken" +
  "&unique=oracle&order=name&dir=asc";

const _CACHE_KEY = "mk_lands_v1";
const _CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function _fetchFromScryfall(onProgress) {
  const lands = [];
  let url = _SCRYFALL_QUERY;
  let page = 0;

  while (url) {
    page++;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Scryfall API error " + resp.status);
    const json = await resp.json();

    for (const card of json.data) {
      // Pour les MDFC : récupérer la face "Land"
      let oracleText = card.oracle_text || "";
      let typeLine = card.type_line || "";
      let producedMana = card.produced_mana;

      if (Array.isArray(card.card_faces)) {
        const landFace = card.card_faces.find((f) =>
          (f.type_line || "").toLowerCase().includes("land"),
        );
        if (landFace) {
          oracleText = landFace.oracle_text || oracleText;
          typeLine = landFace.type_line || typeLine;
          producedMana = landFace.produced_mana || producedMana;
        }
      }

      if (!typeLine.toLowerCase().includes("land")) continue;

      lands.push({
        id: card.oracle_id,
        name: card.name,
        colors: extractColors({
          produced_mana: producedMana,
          color_identity: card.color_identity,
        }),
        type: classifyLand(oracleText, typeLine),
        untapped: isUntapped(oracleText),
        legal: legalityToMask(card.legalities),
      });
    }

    if (onProgress) onProgress(page, lands.length);

    url = json.has_more ? json.next_page : null;
    if (url) await _sleep(120); // ~8 req/s < limite Scryfall (10/s)
  }

  return lands;
}

// ── ALL_LANDS + loadAllLands ──────────────────────────────────────────────────

// Tableau global — rempli par loadAllLands()
// Déclaré avec var pour être accessible globalement (comme avant)
var ALL_LANDS = [];

/**
 * Charge tous les lands (cache localStorage → sinon Scryfall).
 * @param {function(page, total): void} [onProgress] - callback de progression
 * @returns {Promise<Array>} ALL_LANDS rempli
 */
async function loadAllLands(onProgress) {
  // 1. Essayer le cache
  try {
    const raw = localStorage.getItem(_CACHE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (
        Date.now() - ts < _CACHE_TTL &&
        Array.isArray(data) &&
        data.length > 0
      ) {
        ALL_LANDS = data;
        return ALL_LANDS;
      }
    }
  } catch (e) {
    /* cache corrompu — on re-fetch */
  }

  // 2. Fetch Scryfall
  const lands = await _fetchFromScryfall(onProgress);
  ALL_LANDS = lands;

  // 3. Mettre en cache
  try {
    localStorage.setItem(
      _CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: lands }),
    );
  } catch (e) {
    /* localStorage plein ou indisponible */
  }

  return ALL_LANDS;
}

/**
 * Invalide le cache et force un rechargement au prochain appel.
 */
function invalidateLandCache() {
  try {
    localStorage.removeItem(_CACHE_KEY);
  } catch (e) {}
}

// Démarre le chargement dès que le script est inclus.
// ui.js doit awaiter cette promesse avant d'utiliser ALL_LANDS :
//   await allLandsReady;
var allLandsReady = loadAllLands();

// ── getAvailableLands ─────────────────────────────────────────────────────────

/**
 * Filtre ALL_LANDS selon les types cochés et la légalité dans un format.
 * @param {Set<string>|null} selectedTypes - types cochés ('basic', 'fetchland', …)
 * @param {string} [format='standard']
 * @returns {Array} lands filtrés
 */
function getAvailableLands(selectedTypes, format) {
  const fmt = format || "standard";
  const fmtIdx = FORMAT_BITS.indexOf(fmt);

  return ALL_LANDS.filter((land) => {
    // Filtre légalité
    if (fmtIdx >= 0 && !(land.legal & (1 << fmtIdx))) return false;
    // Filtre type
    if (!selectedTypes || selectedTypes.size === 0) return true;
    return selectedTypes.has(land.type);
  });
}



// ── parseDecklist ─────────────────────────────────────────────────────────────

const _BASIC_NAMES = new Set([
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
  "wastes",
]);

/**
 * Parse une decklist format Arena/MTGO.
 * Ignore les terres de base et les lignes vides / commentaires.
 * @param {string} text
 * @returns {{ qty: number, name: string }[]}
 */
function parseDecklist(text) {
  const out = [];
  for (const raw of (text || "").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    const m = line.match(/^(\d+)[xX]?\s+(.+)$/);
    if (!m) continue;
    const qty = parseInt(m[1], 10);
    const name = m[2].trim();
    if (qty > 0 && !_BASIC_NAMES.has(name.toLowerCase())) {
      out.push({ qty, name });
    }
  }
  return out;
}
