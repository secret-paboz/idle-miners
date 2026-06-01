// ============================================================
// STATE.JS — Primary game state manager
// Holds the global mutable state object and LocalStorage keys
// ============================================================

const SAVE_KEY  = "idle_miners_save";
const GUEST_KEY = "idle_miners_guest";

const DEFAULT_STATE = {
  // Identity
  nickname: "",
  isGuest: true,

  // VIP status (authoritative copy comes from Supabase on login)
  isVip: false,
  vipExpiresAt: 0,

  // Currencies
  cash: 0,
  cashEarned: 0,
  shards: 0,

  // Mining resources
  ore: 0,
  currentOreId: "dirt",

  // Player progression
  level: 1,
  xp: 0,
  blocksMined: 0,

  // Equipment
  pickaxeLevel: 1,
  backpackLevel: 1,

  // Prestige progression
  rebirths: 0,
  prestiges: 0,
  prestigeTokens: 0,

  // Prestige shop permanent upgrades
  prestigeUpgrades: {
    merchantLevel: 0,
    greedLevel: 0,
    speedLevel: 0,
    storageLevel: 0,
  },

  // Current dimension
  dimension: "earth",
  dimensionUnlocked: ["earth"],

  // Pets owned { petId: { owned, level, unlockedAbility } }
  pets: {},

  // Active buffs
  buffs: {
    rageActive: false,
    rageEndsAt: 0,
    wingsActive: false,
    wingsEndsAt: 0,
  },

  // Active boosters from crates
  boosters: {
    miningSpeed: { multiplier: 1, endsAt: 0 },
    sellValue:   { multiplier: 1, endsAt: 0 },
    xpGain:      { multiplier: 1, endsAt: 0 },
  },

  // Crate inventory { crateId: count }
  crates: {},

  // Offline progress tracking
  lastOnlineTime: 0,

  // Tracking
  lastSaveTime: 0,
  lastHuntTime: 0,
  lastFishTime: 0,
  lastQuestTime: 0,
  lastHourlyTime: -1,
  lastDailyTime: -1,
  lastWeeklyTime: -1,
  lastRageTime: 0,
  lastWingsTime: 0,

  // GM preferences (persisted)
  gmHiddenFromLeaderboard: false,

  // Session (not saved)
  totalPlayTime: 0,
};

// IMPORTANT: Never reassign — only mutate in place.
const state = {};

function initState() {
  const saved = localStorage.getItem(SAVE_KEY);
  let loaded;

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      loaded = deepMerge(DEFAULT_STATE, parsed);
    } catch (e) {
      console.warn("Save data corrupted, starting fresh.");
      loaded = deepCopy(DEFAULT_STATE);
    }
  } else {
    loaded = deepCopy(DEFAULT_STATE);
  }

  Object.assign(state, loaded);

  const now = Date.now();
  if (state.lastHourlyTime === -1) state.lastHourlyTime = now;
  if (state.lastDailyTime  === -1) state.lastDailyTime  = now;
  if (state.lastWeeklyTime === -1) state.lastWeeklyTime = now;

  // Expire VIP locally if past expiry
  if (state.vipExpiresAt > 0 && Date.now() > state.vipExpiresAt) {
    state.isVip       = false;
    state.vipExpiresAt = 0;
  }

  return state;
}

function saveState() {
  state.lastSaveTime  = Date.now();
  state.lastOnlineTime = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
}

function resetStateForRebirth() {
  const kept = {
    nickname:          state.nickname,
    isGuest:           state.isGuest,
    isVip:             state.isVip,
    vipExpiresAt:      state.vipExpiresAt,
    shards:            state.shards,
    pets:              state.pets,
    crates:            state.crates,
    rebirths:          state.rebirths + 1,
    prestiges:         state.prestiges,
    prestigeTokens:    state.prestigeTokens,
    prestigeUpgrades:  state.prestigeUpgrades,
    dimensionUnlocked: state.dimensionUnlocked,
    cashEarned:        state.cashEarned,
    blocksMined:       state.blocksMined,
    lastHuntTime:      state.lastHuntTime,
    lastFishTime:      state.lastFishTime,
    lastHourlyTime:    state.lastHourlyTime,
    lastDailyTime:     state.lastDailyTime,
    lastWeeklyTime:    state.lastWeeklyTime,
    lastOnlineTime:    state.lastOnlineTime,
  };

  const fresh = deepCopy(DEFAULT_STATE);
  Object.assign(fresh, kept);

  for (const key of Object.keys(state)) {
    delete state[key];
  }
  Object.assign(state, fresh);

  updateDimensionUnlocks();
  saveState();
}

function resetStateForPrestige() {
  const now = Date.now();
  const kept = {
    nickname:         state.nickname,
    isGuest:          state.isGuest,
    isVip:            state.isVip,
    vipExpiresAt:     state.vipExpiresAt,
    prestiges:        state.prestiges + 1,
    prestigeTokens:   state.prestigeTokens + 1,
    prestigeUpgrades: state.prestigeUpgrades,
    lastHourlyTime:   now,
    lastDailyTime:    now,
    lastWeeklyTime:   now,
    lastOnlineTime:   now,
  };

  const fresh = deepCopy(DEFAULT_STATE);
  Object.assign(fresh, kept);

  for (const key of Object.keys(state)) {
    delete state[key];
  }
  Object.assign(state, fresh);

  saveState();
}

function updateDimensionUnlocks() {
  const allDimensions = [
    "earth", "cave", "snow", "nether",
    "crimson", "warped", "end", "void", "aether"
  ];
  const unlockedCount = Math.min(
    Math.floor(state.rebirths / 3) + 1,
    allDimensions.length
  );
  state.dimensionUnlocked = allDimensions.slice(0, unlockedCount);
  state.dimension = state.dimensionUnlocked[unlockedCount - 1];
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge(defaults, saved) {
  const result = deepCopy(defaults);
  for (const key in saved) {
    if (
      saved[key] !== null &&
      typeof saved[key] === "object" &&
      !Array.isArray(saved[key]) &&
      key in result
    ) {
      result[key] = deepMerge(result[key], saved[key]);
    } else {
      result[key] = saved[key];
    }
  }
  return result;
}

export {
  state,
  DEFAULT_STATE,
  SAVE_KEY,
  GUEST_KEY,
  initState,
  saveState,
  resetStateForRebirth,
  resetStateForPrestige,
  updateDimensionUnlocks,
  deepCopy,
};
