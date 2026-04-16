/* data.js — Lands légaux en Standard (mise à jour : 2025)
   Source de vérité pour tous les dual lands disponibles dans le format. */

const ALL_LANDS = [
  /* ── Shock lands (Ravnica Remastered, légaux Standard jusqu'à rotation) ── */
  { id: 'hallowed-fountain',  name: 'Hallowed Fountain',  colors: ['W','U'], type: 'shockland',  untapped: true  },
  { id: 'watery-grave',       name: 'Watery Grave',       colors: ['U','B'], type: 'shockland',  untapped: true  },
  { id: 'blood-crypt',        name: 'Blood Crypt',        colors: ['B','R'], type: 'shockland',  untapped: true  },
  { id: 'stomping-ground',    name: 'Stomping Ground',    colors: ['R','G'], type: 'shockland',  untapped: true  },
  { id: 'temple-garden',      name: 'Temple Garden',      colors: ['G','W'], type: 'shockland',  untapped: true  },
  { id: 'godless-shrine',     name: 'Godless Shrine',     colors: ['W','B'], type: 'shockland',  untapped: true  },
  { id: 'steam-vents',        name: 'Steam Vents',        colors: ['U','R'], type: 'shockland',  untapped: true  },
  { id: 'overgrown-tomb',     name: 'Overgrown Tomb',     colors: ['B','G'], type: 'shockland',  untapped: true  },
  { id: 'sacred-foundry',     name: 'Sacred Foundry',     colors: ['R','W'], type: 'shockland',  untapped: true  },
  { id: 'breeding-pool',      name: 'Breeding Pool',      colors: ['G','U'], type: 'shockland',  untapped: true  },

  /* ── Check lands ── */
  { id: 'sunpetal-grove',     name: 'Sunpetal Grove',     colors: ['G','W'], type: 'checkland',  untapped: true  },
  { id: 'drowned-catacomb',   name: 'Drowned Catacomb',   colors: ['U','B'], type: 'checkland',  untapped: true  },
  { id: 'dragonskull-summit', name: 'Dragonskull Summit', colors: ['B','R'], type: 'checkland',  untapped: true  },
  { id: 'rootbound-crag',     name: 'Rootbound Crag',     colors: ['R','G'], type: 'checkland',  untapped: true  },
  { id: 'glacial-fortress',   name: 'Glacial Fortress',   colors: ['W','U'], type: 'checkland',  untapped: true  },
  { id: 'isolated-chapel',    name: 'Isolated Chapel',    colors: ['W','B'], type: 'checkland',  untapped: true  },
  { id: 'sulfur-falls',       name: 'Sulfur Falls',       colors: ['U','R'], type: 'checkland',  untapped: true  },
  { id: 'woodland-cemetery',  name: 'Woodland Cemetery',  colors: ['B','G'], type: 'checkland',  untapped: true  },
  { id: 'clifftop-retreat',   name: 'Clifftop Retreat',   colors: ['R','W'], type: 'checkland',  untapped: true  },
  { id: 'hinterland-harbor',  name: 'Hinterland Harbor',  colors: ['G','U'], type: 'checkland',  untapped: true  },

  /* ── Fast lands ── */
  { id: 'inspiring-vantage',  name: 'Inspiring Vantage',  colors: ['R','W'], type: 'fastland',   untapped: true  },
  { id: 'botanical-sanctum',  name: 'Botanical Sanctum',  colors: ['G','U'], type: 'fastland',   untapped: true  },
  { id: 'concealed-courtyard',name: 'Concealed Courtyard',colors: ['W','B'], type: 'fastland',   untapped: true  },
  { id: 'spirebluff-canal',   name: 'Spirebluff Canal',   colors: ['U','R'], type: 'fastland',   untapped: true  },
  { id: 'blooming-marsh',     name: 'Blooming Marsh',     colors: ['B','G'], type: 'fastland',   untapped: true  },

  /* ── Slow lands (Innistrad: Midnight Hunt) ── */
  { id: 'deserted-beach',     name: 'Deserted Beach',     colors: ['W','U'], type: 'slowland',   untapped: false },
  { id: 'shipwreck-marsh',    name: 'Shipwreck Marsh',    colors: ['U','B'], type: 'slowland',   untapped: false },
  { id: 'haunted-ridge',      name: 'Haunted Ridge',      colors: ['B','R'], type: 'slowland',   untapped: false },
  { id: 'rockfall-vale',      name: 'Rockfall Vale',      colors: ['R','G'], type: 'slowland',   untapped: false },
  { id: 'overgrown-farmland', name: 'Overgrown Farmland', colors: ['G','W'], type: 'slowland',   untapped: false },
  { id: 'sundown-pass',       name: 'Sundown Pass',       colors: ['R','W'], type: 'slowland',   untapped: false },
  { id: 'stormcarved-coast',  name: 'Stormcarved Coast',  colors: ['U','R'], type: 'slowland',   untapped: false },
  { id: 'deathcap-glade',     name: 'Deathcap Glade',     colors: ['B','G'], type: 'slowland',   untapped: false },
  { id: 'vine-trellis',       name: 'Vineglimmer Snarl',  colors: ['G','U'], type: 'slowland',   untapped: false },
  { id: 'shattered-sanctum',  name: 'Shattered Sanctum',  colors: ['W','B'], type: 'slowland',   untapped: false },

  /* ── Triomes (New Capenna) ── */
  { id: 'jetmirs-nexus',      name: "Jetmir's Nexus",     colors: ['R','G','W'], type: 'triome', untapped: false },
  { id: 'xanders-lounge',     name: "Xander's Lounge",    colors: ['U','B','R'], type: 'triome', untapped: false },
  { id: 'raffines-tower',     name: "Raffine's Tower",    colors: ['W','U','B'], type: 'triome', untapped: false },
  { id: 'sparas-hq',          name: "Spara's Headquarters",colors:['G','W','U'], type: 'triome', untapped: false },
  { id: 'ziatorass-ground',   name: "Ziatora's Proving Ground", colors: ['B','R','G'], type: 'triome', untapped: false },

  /* ── Basics ── */
  { id: 'basic-plains',   name: 'Plains',   colors: ['W'], type: 'basicland', untapped: true },
  { id: 'basic-island',   name: 'Island',   colors: ['U'], type: 'basicland', untapped: true },
  { id: 'basic-swamp',    name: 'Swamp',    colors: ['B'], type: 'basicland', untapped: true },
  { id: 'basic-mountain', name: 'Mountain', colors: ['R'], type: 'basicland', untapped: true },
  { id: 'basic-forest',   name: 'Forest',   colors: ['G'], type: 'basicland', untapped: true },
];

/* Noms complets des types pour l'UI */
const TYPE_LABELS = {
  shockland: 'Shock lands',
  checkland: 'Check lands',
  fastland:  'Fast lands',
  slowland:  'Slow lands',
  triome:    'Triomes',
  basicland: 'Basics',
};

const COLOR_NAMES = { W: 'Blanc', U: 'Bleu', B: 'Noir', R: 'Rouge', G: 'Vert' };
const COLOR_VARS  = { W: '--w',   U: '--u',   B: '--b',  R: '--r',   G: '--g'  };
const PIP_CLASS   = { W: 'pip-w', U: 'pip-u', B: 'pip-b',R: 'pip-r', G: 'pip-g' };