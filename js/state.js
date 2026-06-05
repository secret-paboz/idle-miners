// ============================================================
// STATE.JS — Primary game state manager
// Holds the global mutable state object and LocalStorage keys
// ============================================================

const SAVE_KEY  = "idle_miners_save";
const GUEST_KEY = "idle_miners_guest";

const DEFAULT_STATE = {
  // Identity
  nickname: "",
  playerId: "",   // Supabase player_id (e.g. "piererra") — loaded on login
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

  // Active boosters from crates or GM
  // isGm: true means applied by a Game Master (shown differently in UI)
  boosters: {
    miningSpeed: { multiplier: 1, endsAt: 0, isGm: false },
    sellValue:   { multiplier: 1, endsAt: 0, isGm: false },
    xpGain:      { multiplier: 1, endsAt: 0, isGm: false },
  },

  // Crate inventory { crateId: count }
  crates: {},

  // Offline progress tracking
  // -1 = first boot (no offline progress); gets stamped to Date.now() in initState()
  lastOnlineTime: -1,

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
  if (state.lastHourlyTime  === -1) state.lastHourlyTime  = now;
  if (state.lastDailyTime   === -1) state.lastDailyTime   = now;
  if (state.lastWeeklyTime  === -1) state.lastWeeklyTime  = now;
  // First-ever boot: stamp now so the next session can calculate offline progress.
  // Also handles legacy saves that stored 0 (falsy) — treat those as "just now".
  if (!state.lastOnlineTime || state.lastOnlineTime === -1) state.lastOnlineTime = now;

  // Expire VIP locally if past expiry
  if (state.vipExpiresAt > 0 && Date.now() > state.vipExpiresAt) {
    state.isVip       = false;
    state.vipExpiresAt = 0;
  }

  return state;
}

// ============================================================
// CLAMP STATE — Sanitize invalid/corrupted values before saving
// Guards against NaN, Infinity, negatives, and type mismatches
// ============================================================

function clampState() {
  const nn = (v, fallback = 0) => (typeof v === "number" && isFinite(v) ? v : fallback);
  const pos = (v, fallback = 0) => Math.max(0, nn(v, fallback));

  // Currencies
  state.cash        = pos(state.cash);
  state.cashEarned  = pos(state.cashEarned);
  state.shards      = pos(state.shards);

  // Mining resources
  state.ore         = pos(state.ore);

  // Player progression
  state.level       = Math.max(1, Math.floor(pos(state.level, 1)));
  state.xp          = pos(state.xp);
  state.blocksMined = pos(state.blocksMined);

  // Equipment
  state.pickaxeLevel  = Math.max(1, Math.floor(pos(state.pickaxeLevel, 1)));
  state.backpackLevel = Math.max(1, Math.floor(pos(state.backpackLevel, 1)));

  // Prestige progression
  state.rebirths       = pos(Math.floor(state.rebirths));
  state.prestiges      = pos(Math.floor(state.prestiges));
  state.prestigeTokens = pos(Math.floor(state.prestigeTokens));

  // Prestige shop upgrades
  if (state.prestigeUpgrades && typeof state.prestigeUpgrades === "object") {
    for (const key of ["merchantLevel", "greedLevel", "speedLevel", "storageLevel"]) {
      state.prestigeUpgrades[key] = pos(Math.floor(state.prestigeUpgrades[key]));
    }
  }

  // VIP
  state.vipExpiresAt = pos(state.vipExpiresAt);
  if (typeof state.isVip !== "boolean") state.isVip = false;

  // Booleans
  if (typeof state.isGuest !== "boolean") state.isGuest = true;
  if (typeof state.gmHiddenFromLeaderboard !== "boolean") state.gmHiddenFromLeaderboard = false;

  // Strings
  if (typeof state.nickname !== "string")     state.nickname     = "";
  if (typeof state.playerId !== "string")     state.playerId     = "";
  if (typeof state.currentOreId !== "string") state.currentOreId = "dirt";
  if (typeof state.dimension !== "string")    state.dimension    = "earth";

  // Offline tracking — must be a positive finite number
  state.lastOnlineTime = pos(state.lastOnlineTime);

  // Boosters — clamp multipliers to sane range [1, 100], preserve isGm flag
  if (state.boosters && typeof state.boosters === "object") {
    for (const key of ["miningSpeed", "sellValue", "xpGain"]) {
      if (state.boosters[key]) {
        state.boosters[key].multiplier = Math.min(100, Math.max(1, nn(state.boosters[key].multiplier, 1)));
        state.boosters[key].endsAt     = pos(state.boosters[key].endsAt);
        state.boosters[key].isGm       = state.boosters[key].isGm === true;
      }
    }
  }
}

function saveState() {
  state.lastSaveTime   = Date.now();
  state.lastOnlineTime = Date.now();
  clampState();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
}

function resetStateForRebirth() {
  const kept = {
    nickname:          state.nickname,
    playerId:          state.playerId,
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
    playerId:         state.playerId,
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
  clampState,
  resetStateForRebirth,
  resetStateForPrestige,
  updateDimensionUnlocks,
  deepCopy,
};
