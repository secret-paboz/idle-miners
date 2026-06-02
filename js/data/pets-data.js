// ============================================================
// PETS-DATA.JS — Full pet roster with rarity & effect table
// Icons use Font Awesome 6 Free classes (already loaded in index.html)
//
// CHANGED:
// - Legendary pets are now PASSIVE boosters (no active ability)
//   Wither:      passive mining speed boost (like uncommon)
//   Ender Dragon: passive sell value boost (like rare)
// - RARITY_CONFIG legendary effectType changed from "ability" to
//   "mining" and "sell" respectively (handled per-pet in economy.js)
// - FISH_TABLE cash entry: amount set to 0 (dynamic in pets.js)
// ============================================================

export const RARITY = {
  COMMON:    "common",
  UNCOMMON:  "uncommon",
  RARE:      "rare",
  LEGENDARY: "legendary",
};

export const RARITY_CONFIG = {
  common: {
    label:       "Common",
    color:       "#9e9e9e",
    glowColor:   "rgba(158,158,158,0.3)",
    shardCost:   5,
    dropWeight:  60,
    effectType:  "backpack",
    effectLabel: "Backpack Capacity",
  },
  uncommon: {
    label:       "Uncommon",
    color:       "#4caf50",
    glowColor:   "rgba(76,175,80,0.3)",
    shardCost:   15,
    dropWeight:  25,
    effectType:  "mining",
    effectLabel: "Mining Speed",
  },
  rare: {
    label:       "Rare",
    color:       "#2196f3",
    glowColor:   "rgba(33,150,243,0.3)",
    shardCost:   40,
    dropWeight:  12,
    effectType:  "sell",
    effectLabel: "Sell Value",
  },
  legendary: {
    label:       "Legendary",
    color:       "#ffc107",
    glowColor:   "rgba(255,193,7,0.4)",
    shardCost:   100,
    dropWeight:  3,
    effectType:  "legendary",
    effectLabel: "Passive Boost",
  },
};

// ── Pet roster ────────────────────────────────────────────
// icon: Font Awesome 6 Free class string

export const PETS_DATA = {

  // ── COMMON PETS (backpack storage boost) ──────────────
  chicken: {
    id:          "chicken",
    name:        "Chicken",
    rarity:      RARITY.COMMON,
    icon:        "fa-solid fa-feather",
    description: "A simple farm bird. Somehow makes your backpack bigger.",
    modifier:    0.05,
    maxLevel:    50,
  },
  cow: {
    id:          "cow",
    name:        "Cow",
    rarity:      RARITY.COMMON,
    icon:        "fa-solid fa-cow",
    description: "A sturdy bovine companion. Stomps extra space into your pack.",
    modifier:    0.06,
    maxLevel:    50,
  },
  pig: {
    id:          "pig",
    name:        "Pig",
    rarity:      RARITY.COMMON,
    icon:        "fa-solid fa-hippo",
    description: "Oinks enthusiastically. Expands storage with sheer enthusiasm.",
    modifier:    0.06,
    maxLevel:    50,
  },
  sheep: {
    id:          "sheep",
    name:        "Sheep",
    rarity:      RARITY.COMMON,
    icon:        "fa-solid fa-cloud",
    description: "Fluffy and reliable. Wool padding adds backpack volume.",
    modifier:    0.07,
    maxLevel:    50,
  },

  // ── UNCOMMON PETS (mining speed boost) ────────────────
  creeper: {
    id:          "creeper",
    name:        "Creeper",
    rarity:      RARITY.UNCOMMON,
    icon:        "fa-solid fa-bomb",
    description: "Volatile but useful. Blasts ore loose faster than any pickaxe.",
    modifier:    0.08,
    maxLevel:    50,
  },
  zombie: {
    id:          "zombie",
    name:        "Zombie",
    rarity:      RARITY.UNCOMMON,
    icon:        "fa-solid fa-biohazard",
    description: "Relentlessly digs. Never stops. Never sleeps.",
    modifier:    0.08,
    maxLevel:    50,
  },
  skeleton: {
    id:          "skeleton",
    name:        "Skeleton",
    rarity:      RARITY.UNCOMMON,
    icon:        "fa-solid fa-bone",
    description: "Bony arms swing pickaxe with surprising efficiency.",
    modifier:    0.09,
    maxLevel:    50,
  },
  spider: {
    id:          "spider",
    name:        "Spider",
    rarity:      RARITY.UNCOMMON,
    icon:        "fa-solid fa-spider",
    description: "Eight legs, eight times the mining power.",
    modifier:    0.10,
    maxLevel:    50,
  },

  // ── RARE PETS (sell value boost) ──────────────────────
  blaze: {
    id:          "blaze",
    name:        "Blaze",
    rarity:      RARITY.RARE,
    icon:        "fa-solid fa-fire-flame-curved",
    description: "Burns impurities out of ore, massively increasing market value.",
    modifier:    0.12,
    maxLevel:    40,
  },
  enderman: {
    id:          "enderman",
    name:        "Enderman",
    rarity:      RARITY.RARE,
    icon:        "fa-solid fa-user-secret",
    description: "Teleports ore directly to the best buyers.",
    modifier:    0.13,
    maxLevel:    40,
  },
  guardian: {
    id:          "guardian",
    name:        "Guardian",
    rarity:      RARITY.RARE,
    icon:        "fa-solid fa-shield-halved",
    description: "Ancient protector. Negotiates premium prices for your ore.",
    modifier:    0.15,
    maxLevel:    40,
  },

  // ── LEGENDARY PETS (passive dual boost) ───────────────
  // Wither:      passive mining speed boost
  // Ender Dragon: passive sell value boost
  // Both also grant a smaller backpack bonus via legendaryBackpack
  wither: {
    id:               "wither",
    name:             "Wither",
    rarity:           RARITY.LEGENDARY,
    icon:             "fa-solid fa-skull",
    description:      "The destroyer of worlds. Passively boosts your mining speed.",
    modifier:         0.20,
    maxLevel:         30,
    legendaryEffect:  "mining",   // which bonus pool it feeds into
  },
  enderdragon: {
    id:               "enderdragon",
    name:             "Ender Dragon",
    rarity:           RARITY.LEGENDARY,
    icon:             "fa-solid fa-dragon",
    description:      "Ruler of The End. Passively boosts your sell value.",
    modifier:         0.20,
    maxLevel:         30,
    legendaryEffect:  "sell",     // which bonus pool it feeds into
  },
};

// ── Hunt loot table ───────────────────────────────────────
export const HUNT_TABLE = [
  { type: "pet", petId: "wither",      weight: 1  },
  { type: "pet", petId: "enderdragon", weight: 1  },
  { type: "pet", petId: "blaze",       weight: 3  },
  { type: "pet", petId: "enderman",    weight: 3  },
  { type: "pet", petId: "guardian",    weight: 3  },
  { type: "pet", petId: "creeper",     weight: 6  },
  { type: "pet", petId: "zombie",      weight: 6  },
  { type: "pet", petId: "skeleton",    weight: 6  },
  { type: "pet", petId: "spider",      weight: 6  },
  { type: "pet", petId: "chicken",     weight: 10 },
  { type: "pet", petId: "cow",         weight: 10 },
  { type: "pet", petId: "pig",         weight: 10 },
  { type: "pet", petId: "sheep",       weight: 10 },
  { type: "shards", amount: 3,         weight: 15 },
  { type: "shards", amount: 5,         weight: 10 },
];

// ── Fish loot table ───────────────────────────────────────
// cash amount is 0 here — pets.js doFish() calculates it
// dynamically based on rebirths and ore value at catch time.
export const FISH_TABLE = [
  { type: "shards", amount: 10, weight: 5,  label: "Sunken Treasure"  },
  { type: "shards", amount: 5,  weight: 15, label: "Shiny Shell"      },
  { type: "shards", amount: 2,  weight: 30, label: "Old Boot"         },
  { type: "cash",   amount: 0,  weight: 25, label: "Waterlogged Coin" },
  { type: "junk",   amount: 0,  weight: 25, label: "Soggy Fish"       },
];

// ── Cooldown configs (ms) ─────────────────────────────────
export const COOLDOWNS = {
  hunt:    30 * 60 * 1000,
  fish:    30 * 60 * 1000,
  hourly:  60 * 60 * 1000,
  daily:   24 * 60 * 60 * 1000,
  weekly:  7 * 24 * 60 * 60 * 1000,
};
