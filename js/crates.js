// ============================================================
// CRATES.JS — Booster crate definitions and open logic
// icon: Font Awesome 6 Free class strings
// ============================================================

import { state, saveState } from "./state.js";

export const CRATE_TYPES = {

  hourly: {
    id:          "hourly",
    name:        "Hourly Crate",
    description: "A small crate from checking in every hour.",
    color:       "#78909c",
    glowColor:   "rgba(120,144,156,0.3)",
    icon:        "fa-solid fa-box",
    lootTable: [
      { type: "booster", boosterKey: "miningSpeed", label: "Mining Rush",   description: "2x mining speed", multiplier: 2,   duration: 5 * 60 * 1000, weight: 40 },
      { type: "booster", boosterKey: "sellValue",   label: "Market Surge",  description: "1.5x sell value", multiplier: 1.5, duration: 5 * 60 * 1000, weight: 35 },
      { type: "booster", boosterKey: "xpGain",      label: "XP Boost",      description: "2x XP gain",      multiplier: 2,   duration: 5 * 60 * 1000, weight: 25 },
    ],
  },

  daily: {
    id:          "daily",
    name:        "Daily Crate",
    description: "A solid crate for logging in every day.",
    color:       "#42a5f5",
    glowColor:   "rgba(66,165,245,0.3)",
    icon:        "fa-solid fa-gift",
    lootTable: [
      { type: "booster", boosterKey: "miningSpeed", label: "Mining Frenzy",    description: "3x mining speed", multiplier: 3, duration: 15 * 60 * 1000, weight: 35 },
      { type: "booster", boosterKey: "sellValue",   label: "Gold Rush",        description: "2x sell value",   multiplier: 2, duration: 15 * 60 * 1000, weight: 35 },
      { type: "booster", boosterKey: "xpGain",      label: "Knowledge Surge",  description: "3x XP gain",      multiplier: 3, duration: 15 * 60 * 1000, weight: 30 },
    ],
  },

  weekly: {
    id:          "weekly",
    name:        "Weekly Crate",
    description: "A premium crate for dedicated miners.",
    color:       "#ab47bc",
    glowColor:   "rgba(171,71,188,0.4)",
    icon:        "fa-solid fa-crown",
    lootTable: [
      { type: "booster", boosterKey: "miningSpeed", label: "Mega Rush",       description: "5x mining speed", multiplier: 5, duration: 30 * 60 * 1000, weight: 30 },
      { type: "booster", boosterKey: "sellValue",   label: "Diamond Market",  description: "3x sell value",   multiplier: 3, duration: 30 * 60 * 1000, weight: 35 },
      { type: "booster", boosterKey: "xpGain",      label: "Wisdom Crate",    description: "5x XP gain",      multiplier: 5, duration: 30 * 60 * 1000, weight: 35 },
    ],
  },

  common: {
    id:          "common",
    name:        "Common Crate",
    description: "Found from fishing and hunting.",
    color:       "#9e9e9e",
    glowColor:   "rgba(158,158,158,0.3)",
    icon:        "fa-solid fa-box-open",
    lootTable: [
      { type: "booster", boosterKey: "miningSpeed", label: "Speed Chip",   description: "2x mining speed",  multiplier: 2,   duration: 10 * 60 * 1000, weight: 40 },
      { type: "booster", boosterKey: "sellValue",   label: "Price Tag",    description: "1.5x sell value",  multiplier: 1.5, duration: 10 * 60 * 1000, weight: 35 },
      { type: "booster", boosterKey: "xpGain",      label: "Study Notes",  description: "2x XP gain",       multiplier: 2,   duration: 10 * 60 * 1000, weight: 25 },
    ],
  },

  rare: {
    id:          "rare",
    name:        "Rare Crate",
    description: "Uncommon find. Strong boosts inside.",
    color:       "#26c6da",
    glowColor:   "rgba(38,198,218,0.4)",
    icon:        "fa-solid fa-gem",
    lootTable: [
      { type: "booster", boosterKey: "miningSpeed", label: "Overdrive",  description: "4x mining speed",  multiplier: 4,   duration: 20 * 60 * 1000, weight: 33 },
      { type: "booster", boosterKey: "sellValue",   label: "Monopoly",   description: "2.5x sell value",  multiplier: 2.5, duration: 20 * 60 * 1000, weight: 33 },
      { type: "booster", boosterKey: "xpGain",      label: "Brain Boost", description: "4x XP gain",      multiplier: 4,   duration: 20 * 60 * 1000, weight: 34 },
    ],
  },

  legendary: {
    id:          "legendary",
    name:        "Legendary Crate",
    description: "Exceedingly rare. Massive boosts await.",
    color:       "#ffc107",
    glowColor:   "rgba(255,193,7,0.5)",
    icon:        "fa-solid fa-trophy",
    lootTable: [
      { type: "booster", boosterKey: "miningSpeed", label: "Godspeed",     description: "10x mining speed", multiplier: 10, duration: 60 * 60 * 1000, weight: 33 },
      { type: "booster", boosterKey: "sellValue",   label: "Black Market", description: "5x sell value",    multiplier: 5,  duration: 60 * 60 * 1000, weight: 33 },
      { type: "booster", boosterKey: "xpGain",      label: "Enlightenment",description: "10x XP gain",      multiplier: 10, duration: 60 * 60 * 1000, weight: 34 },
    ],
  },
};

function rollWeighted(table) {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  let roll    = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return table[table.length - 1];
}

export function openCrate(crateId) {
  const crateData = CRATE_TYPES[crateId];
  if (!crateData) return { success: false, message: "Unknown crate type." };

  const owned = state.crates[crateId] || 0;
  if (owned <= 0) return { success: false, message: `No ${crateData.name} to open.` };

  state.crates[crateId] = owned - 1;

  const loot = rollWeighted(crateData.lootTable);

  if (loot.type === "booster") {
    const booster    = state.boosters[loot.boosterKey];
    const now        = Date.now();
    const currentEnd = booster.endsAt > now ? booster.endsAt : now;
    booster.multiplier = Math.max(booster.multiplier, loot.multiplier);
    booster.endsAt     = currentEnd + loot.duration;
  }

  saveState();

  return {
    success:   true,
    result:    loot,
    crateData,
    message:   `Opened ${crateData.name}: ${loot.label}! ${loot.description}.`,
  };
}

export function openAllCrates() {
  const results = [];
  for (const crateId in state.crates) {
    const count = state.crates[crateId] || 0;
    for (let i = 0; i < count; i++) {
      results.push(openCrate(crateId));
    }
  }
  return results;
}

export function openAllOfType(crateId) {
  const results = [];
  const count   = state.crates[crateId] || 0;
  for (let i = 0; i < count; i++) {
    results.push(openCrate(crateId));
  }
  return results;
}

export function addCrate(crateId, amount = 1) {
  if (!CRATE_TYPES[crateId]) return false;
  state.crates[crateId] = (state.crates[crateId] || 0) + amount;
  saveState();
  return true;
}

export function getBoosterStatus() {
  const now    = Date.now();
  const status = {};
  for (const key in state.boosters) {
    const booster  = state.boosters[key];
    const isActive = booster.endsAt > now;
    status[key] = {
      active:     isActive,
      multiplier: isActive ? booster.multiplier : 1,
      endsAt:     booster.endsAt,
      remaining:  isActive ? Math.ceil((booster.endsAt - now) / 1000) : 0,
      formatted:  isActive ? formatBoosterTime(booster.endsAt - now) : "Inactive",
    };
  }
  return status;
}

function formatBoosterTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)   return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function getCrateInventory() {
  return Object.entries(CRATE_TYPES).map(([crateId, crateData]) => ({
    ...crateData,
    count: state.crates[crateId] || 0,
  }));
}

export function getTotalCrates() {
  return Object.values(state.crates).reduce((sum, count) => sum + count, 0);
}
