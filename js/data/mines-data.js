// ============================================================
// MINES-DATA.JS — Mine tiers, XP thresholds, ore block types
// icon: Font Awesome 6 Free class string (for future use)
// ============================================================

export const ORE_TYPES = {
  dirt: {
    id:          "dirt",
    name:        "Dirt",
    baseValue:   1,
    xpPerBlock:  1,
    color:       "#8B5E3C",
    glowColor:   "rgba(139,94,60,0.4)",
    icon:        "fa-solid fa-mound",
    description: "Humble beginnings.",
  },
  stone: {
    id:          "stone",
    name:        "Stone",
    baseValue:   3,
    xpPerBlock:  2,
    color:       "#9e9e9e",
    glowColor:   "rgba(158,158,158,0.4)",
    icon:        "fa-solid fa-cube",
    description: "Solid and dependable.",
  },
  coal: {
    id:          "coal",
    name:        "Coal",
    baseValue:   5,
    xpPerBlock:  3,
    color:       "#424242",
    glowColor:   "rgba(66,66,66,0.5)",
    icon:        "fa-solid fa-circle",
    description: "Black gold. Burns well, sells better.",
  },
  copper: {
    id:          "copper",
    name:        "Copper",
    baseValue:   10,
    xpPerBlock:  5,
    color:       "#e07c3a",
    glowColor:   "rgba(224,124,58,0.4)",
    icon:        "fa-solid fa-circle-dot",
    description: "Warm toned and valuable.",
  },
  iron: {
    id:          "iron",
    name:        "Iron",
    baseValue:   20,
    xpPerBlock:  8,
    color:       "#bdbdbd",
    glowColor:   "rgba(189,189,189,0.4)",
    icon:        "fa-solid fa-bars",
    description: "The backbone of civilization.",
  },
  gold: {
    id:          "gold",
    name:        "Gold",
    baseValue:   50,
    xpPerBlock:  12,
    color:       "#FFD700",
    glowColor:   "rgba(255,215,0,0.4)",
    icon:        "fa-solid fa-coins",
    description: "Shiny and universally desired.",
  },
  redstone: {
    id:          "redstone",
    name:        "Redstone",
    baseValue:   80,
    xpPerBlock:  15,
    color:       "#f44336",
    glowColor:   "rgba(244,67,54,0.5)",
    icon:        "fa-solid fa-gem",
    description: "Pulses with mysterious energy.",
  },
  lapis: {
    id:          "lapis",
    name:        "Lapis",
    baseValue:   120,
    xpPerBlock:  18,
    color:       "#1565c0",
    glowColor:   "rgba(21,101,192,0.5)",
    icon:        "fa-solid fa-gem",
    description: "Deep blue and enchanting.",
  },
  emerald: {
    id:          "emerald",
    name:        "Emerald",
    baseValue:   200,
    xpPerBlock:  25,
    color:       "#4caf50",
    glowColor:   "rgba(76,175,80,0.5)",
    icon:        "fa-solid fa-gem",
    description: "The currency of villagers.",
  },
  diamond: {
    id:          "diamond",
    name:        "Diamond",
    baseValue:   500,
    xpPerBlock:  40,
    color:       "#00bcd4",
    glowColor:   "rgba(0,188,212,0.6)",
    icon:        "fa-solid fa-gem",
    description: "Hardest substance known. Worth every shard.",
  },
  obsidian: {
    id:          "obsidian",
    name:        "Obsidian",
    baseValue:   800,
    xpPerBlock:  55,
    color:       "#1a0533",
    glowColor:   "rgba(26,5,51,0.7)",
    icon:        "fa-solid fa-cubes",
    description: "Born from lava. Impossibly dense.",
  },
  netherite: {
    id:          "netherite",
    name:        "Netherite",
    baseValue:   2000,
    xpPerBlock:  80,
    color:       "#4a148c",
    glowColor:   "rgba(74,20,140,0.7)",
    icon:        "fa-solid fa-layer-group",
    description: "Forged in the deepest Nether heat.",
  },
  ancientDebris: {
    id:          "ancientDebris",
    name:        "Ancient Debris",
    baseValue:   5000,
    xpPerBlock:  120,
    color:       "#6d4c41",
    glowColor:   "rgba(109,76,65,0.7)",
    icon:        "fa-solid fa-skull-crossbones",
    description: "Remnants of a forgotten age.",
  },
};

export const MINE_TIERS = [
  {
    tier:          1,
    name:          "Surface Mine",
    levelRequired: 1,
    description:   "Scratching the surface.",
    ores: [
      { oreId: "dirt",  weight: 70 },
      { oreId: "stone", weight: 30 },
    ],
  },
  {
    tier:          2,
    name:          "Shallow Cave",
    levelRequired: 5,
    description:   "Darker. Deeper. Better.",
    ores: [
      { oreId: "stone", weight: 60 },
      { oreId: "coal",  weight: 40 },
    ],
  },
  {
    tier:          3,
    name:          "Coal Cavern",
    levelRequired: 10,
    description:   "The air smells of ancient fires.",
    ores: [
      { oreId: "stone",  weight: 40 },
      { oreId: "coal",   weight: 45 },
      { oreId: "copper", weight: 15 },
    ],
  },
  {
    tier:          4,
    name:          "Copper Seam",
    levelRequired: 20,
    description:   "Warm veins run through cold rock.",
    ores: [
      { oreId: "coal",   weight: 35 },
      { oreId: "copper", weight: 45 },
      { oreId: "iron",   weight: 20 },
    ],
  },
  {
    tier:          5,
    name:          "Iron Depths",
    levelRequired: 35,
    description:   "The walls gleam with metallic promise.",
    ores: [
      { oreId: "copper", weight: 30 },
      { oreId: "iron",   weight: 50 },
      { oreId: "gold",   weight: 20 },
    ],
  },
  {
    tier:          6,
    name:          "Gold Vein",
    levelRequired: 50,
    description:   "Every wall shimmers with greed.",
    ores: [
      { oreId: "iron",     weight: 30 },
      { oreId: "gold",     weight: 45 },
      { oreId: "redstone", weight: 25 },
    ],
  },
  {
    tier:          7,
    name:          "Redstone Chamber",
    levelRequired: 65,
    description:   "The cave pulses with red energy.",
    ores: [
      { oreId: "gold",     weight: 25 },
      { oreId: "redstone", weight: 45 },
      { oreId: "lapis",    weight: 30 },
    ],
  },
  {
    tier:          8,
    name:          "Lapis Grotto",
    levelRequired: 80,
    description:   "Brilliant blue crystals line every surface.",
    ores: [
      { oreId: "redstone", weight: 20 },
      { oreId: "lapis",    weight: 45 },
      { oreId: "emerald",  weight: 35 },
    ],
  },
  {
    tier:          9,
    name:          "Emerald Basin",
    levelRequired: 100,
    description:   "Rare green stones grow like flowers here.",
    ores: [
      { oreId: "lapis",   weight: 20 },
      { oreId: "emerald", weight: 50 },
      { oreId: "diamond", weight: 30 },
    ],
  },
  {
    tier:          10,
    name:          "Diamond Core",
    levelRequired: 120,
    description:   "The deepest natural mine. Pure brilliance.",
    ores: [
      { oreId: "emerald",  weight: 25 },
      { oreId: "diamond",  weight: 55 },
      { oreId: "obsidian", weight: 20 },
    ],
  },
  {
    tier:          11,
    name:          "Obsidian Vault",
    levelRequired: 150,
    description:   "Dense, dark, impossibly ancient.",
    ores: [
      { oreId: "diamond",   weight: 20 },
      { oreId: "obsidian",  weight: 50 },
      { oreId: "netherite", weight: 30 },
    ],
  },
  {
    tier:          12,
    name:          "Netherite Forge",
    levelRequired: 180,
    description:   "Only the strongest miners reach this depth.",
    ores: [
      { oreId: "obsidian",      weight: 20 },
      { oreId: "netherite",     weight: 50 },
      { oreId: "ancientDebris", weight: 30 },
    ],
  },
  {
    tier:          13,
    name:          "Ancient Ruins",
    levelRequired: 200,
    description:   "The bottom of everything. Legends live here.",
    ores: [
      { oreId: "netherite",     weight: 30 },
      { oreId: "ancientDebris", weight: 70 },
    ],
  },
];

export function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 2.5));
}

export function getMineTier(playerLevel) {
  let currentTier = MINE_TIERS[0];
  for (const tier of MINE_TIERS) {
    if (playerLevel >= tier.levelRequired) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
}

export function rollOre(mineTier) {
  const pool = mineTier.ores;
  const totalWeight = pool.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return ORE_TYPES[entry.oreId];
  }
  return ORE_TYPES[pool[pool.length - 1].oreId];
}
