/* data.js — ManaKurve · Standard land database
 *
 * Source  : lands_standard.json (static, curated)
 * Types   : fastland, surveilland, vergeland, shockland
 */

var COLOR_NAMES = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

var TYPE_LABELS = {
  fastland: "Fast Lands",
  surveilland: "Surveil Lands",
  vergeland: "Verge Lands",
  shockland: "Shock Lands",
  basic: "Basic Lands",
  slowland: "Slow Lands",
  fixedland: "Fixed Lands",
};

var LAND_TYPE_NAMES = TYPE_LABELS;

// ── ALL_LANDS + loadAllLands ──────────────────────────────────────────────────

/** Global array — populated by loadAllLands(). */
var ALL_LANDS = [];

/**
 * Loads all lands from the static JSON file.
 * Filters to standard_legal by default.
 * @returns {Promise<Array>} ALL_LANDS populated
 */
async function loadAllLands() {
  const resp = await fetch("lands_standard.json");
  if (!resp.ok) throw new Error("Failed to load lands_standard.json: " + resp.status);
  const json = await resp.json();

  ALL_LANDS = json.lands
    .filter((land) => land.standard_legal)
    .map((land) => ({
      name: land.name,
      type: land.type,
      colors: land.colors,
      untapped: land.untapped,
    }));

  return ALL_LANDS;
}

/** Starts loading as soon as this script is included. */
var allLandsReady = loadAllLands();

// ── getAvailableLands ─────────────────────────────────────────────────────────

/**
 * Filters ALL_LANDS by the selected type toggles.
 * @param {Set<string>|null} selectedTypes - checked types ('fastland', …)
 * @returns {Array} filtered lands
 */
function getAvailableLands(selectedTypes) {
  return ALL_LANDS.filter((land) => {
    if (!selectedTypes || selectedTypes.size === 0) return true;
    return selectedTypes.has(land.type);
  });
}

// ── parseDecklist (dual-stream) ───────────────────────────────────────────────

/**
 * Builds a name→land lookup from ALL_LANDS for O(1) matching.
 * @returns {Map<string, object>}
 */
function _buildLandIndex() {
  const index = new Map();
  for (const land of ALL_LANDS) {
    index.set(land.name.toLowerCase(), land);
  }
  return index;
}

/**
 * Parses an Arena/MTGO decklist into unknown cards and recognized lands.
 * Recognized lands (in ALL_LANDS) are returned as recognizedLands.
 * Everything else is returned as unknownCards.
 * @param {string} text
 * @returns {{ recognizedLands: {qty: number, name: string, land: object}[], unknownCards: {qty: number, name: string}[] }}
 */
function parseDecklist(text) {
  const landIndex = _buildLandIndex();
  const unknownCards = [];
  const recognizedLands = [];

  for (const raw of (text || "").split("\n")) {
    let line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    if (/^(deck|sideboard|commander|companion)$/i.test(line)) continue;

    // Strip foil flags
    line = line.replace(/\s*\*\w+\*\s*$/, "").trim();

    const m = line.match(/^(\d+)[xX]?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/i);
    if (!m) continue;

    const qty = parseInt(m[1], 10);
    let name = m[2].trim();

    // Double-faced cards: keep front face only
    if (name.includes(" // ")) {
      name = name.split(" // ")[0].trim();
    }

    if (qty <= 0) continue;

    const knownLand = landIndex.get(name.toLowerCase());
    if (knownLand) {
      recognizedLands.push({ qty, name, land: knownLand });
    } else {
      unknownCards.push({ qty, name });
    }
  }

  return { recognizedLands, unknownCards };
}
