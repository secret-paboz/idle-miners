// ============================================================
// GM.JS — Game Master module
//
// Security model:
//   GM status is NEVER stored in state, localStorage, or any
//   writable client storage. It is derived at runtime by
//   fetching the `role` column from the `player_saves` table
//   in Supabase. RLS ensures players can only read their own
//   row and cannot write to the `role` column directly.
//
// To promote a player to GM:
//   Supabase dashboard → Table Editor → player_saves
//   → find their row → set role = 99 → save
//
// Role values:
//   0  = normal player (default)
//   99 = game master
// ============================================================

import { state, saveState } from "./state.js";

// ============================================================
// SECTION 1 — GM CHECK
// ============================================================

export async function isGameMaster() {
  if (!window.supabaseClient) return false;
  try {
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return false;

    const { data, error } = await window.supabaseClient
      .from("player_saves")
      .select("role")
      .eq("id", uid)
      .single();

    if (error || !data) return false;
    return Number(data.role) === 99;
  } catch {
    return false;
  }
}

// Synchronous check — safe for re-renders.
// Only valid AFTER isGameMaster() has been awaited in main.js boot.
export function isGameMasterSync() {
  return window.__gmVerified === true;
}

// NOTE: isGMHiddenFromLeaderboard() and toggleGMLeaderboardVisibility()
// have been removed. The "My Leaderboard" GM card was removed — leaderboard
// visibility for any player (including self) is now handled via the
// Player Lookup card toggle, which calls toggleLeaderboardVisibilityForPlayer()
// in supabase.js directly.

// ============================================================
// SECTION 2 — GM ACTIONS
// All functions mutate state directly and call saveState().
// They return { success, message } for UI feedback.
// ============================================================

export function gmSetCash(amount) {
  const n = parseFloat(amount);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.cash = Math.floor(n);
  saveState();
  return { success: true, message: `Cash set to ${Math.floor(n).toLocaleString()}.` };
}

export function gmSetShards(amount) {
  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.shards = n;
  saveState();
  return { success: true, message: `Shards set to ${n}.` };
}

export function gmSetLevel(level) {
  const n = parseInt(level, 10);
  if (isNaN(n) || n < 1) return { success: false, message: "Level must be at least 1." };
  state.level = n;
  state.xp    = 0;
  saveState();
  return { success: true, message: `Player level set to ${n}.` };
}

export function gmSetXP(amount) {
  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.xp = n;
  saveState();
  return { success: true, message: `XP set to ${n}.` };
}

export function gmSetPickaxe(level) {
  const n = parseInt(level, 10);
  if (isNaN(n) || n < 1) return { success: false, message: "Level must be at least 1." };
  state.pickaxeLevel = n;
  saveState();
  return { success: true, message: `Pickaxe set to Lv.${n}.` };
}

export function gmSetBackpack(level) {
  const n = parseInt(level, 10);
  if (isNaN(n) || n < 1) return { success: false, message: "Level must be at least 1." };
  state.backpackLevel = n;
  saveState();
  return { success: true, message: `Backpack set to Lv.${n}.` };
}

export function gmSetRebirths(amount) {
  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.rebirths = n;
  saveState();
  return { success: true, message: `Rebirths set to ${n}.` };
}

export function gmSetPrestigeTokens(amount) {
  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.prestigeTokens = n;
  saveState();
  return { success: true, message: `Prestige tokens set to ${n}.` };
}

export function gmSetOre(amount) {
  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.ore = n;
  saveState();
  return { success: true, message: `Ore set to ${n}.` };
}

export function gmSetCashEarned(amount) {
  const n = parseFloat(amount);
  if (isNaN(n) || n < 0) return { success: false, message: "Invalid amount." };
  state.cashEarned = Math.floor(n);
  saveState();
  return { success: true, message: `Total cash earned set to ${Math.floor(n).toLocaleString()}.` };
}

export function gmAdjustCash(delta) {
  return gmSetCash(state.cash + parseFloat(delta));
}

export function gmAdjustShards(delta) {
  return gmSetShards(state.shards + parseInt(delta, 10));
}

// ============================================================
// SECTION 3 — CRATE MANAGEMENT
// ============================================================

export function gmAddCrate(crateId, amount) {
  const { CRATE_TYPES } = window.__crateTypes || {};
  // Validate crateId against known types at runtime via import-free check
  const validIds = ["hourly","daily","weekly","common","rare","legendary"];
  if (!validIds.includes(crateId)) return { success: false, message: `Unknown crate type: ${crateId}.` };

  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 1) return { success: false, message: "Amount must be at least 1." };

  state.crates[crateId] = (state.crates[crateId] || 0) + n;
  saveState();
  return { success: true, message: `Added ${n}x ${crateId} crate(s). Total: ${state.crates[crateId]}.` };
}

export function gmRemoveCrate(crateId, amount) {
  const validIds = ["hourly","daily","weekly","common","rare","legendary"];
  if (!validIds.includes(crateId)) return { success: false, message: `Unknown crate type: ${crateId}.` };

  const current = state.crates[crateId] || 0;
  if (current <= 0) return { success: false, message: `No ${crateId} crates to remove.` };

  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 1) return { success: false, message: "Amount must be at least 1." };

  const removed = Math.min(n, current);
  state.crates[crateId] = current - removed;
  saveState();
  return { success: true, message: `Removed ${removed}x ${crateId} crate(s). Remaining: ${state.crates[crateId]}.` };
}

// ============================================================
// SECTION 4 — GM BOOSTER MANAGEMENT
// ============================================================

const VALID_BOOSTER_KEYS = ["miningSpeed", "sellValue", "xpGain"];

/**
 * Set a booster on the LOCAL player's state.
 * For remote players, use gmApplyToPlayer() with a booster patch.
 */
export function gmSetBooster(boosterKey, multiplier, durationMinutes) {
  if (!VALID_BOOSTER_KEYS.includes(boosterKey)) {
    return { success: false, message: `Unknown booster: ${boosterKey}.` };
  }

  const mult = parseFloat(multiplier);
  const mins = parseFloat(durationMinutes);

  if (isNaN(mult) || mult < 1) {
    return { success: false, message: "Multiplier must be at least 1." };
  }
  if (isNaN(mins) || mins < 1) {
    return { success: false, message: "Duration must be at least 1 minute." };
  }

  state.boosters[boosterKey] = {
    multiplier: mult,
    endsAt:     Date.now() + mins * 60 * 1000,
    isGm:       true,
  };

  saveState();
  return {
    success: true,
    message: `${boosterKey} set to ${mult}x for ${mins} min.`,
  };
}

/**
 * Clear a booster on the LOCAL player's state.
 */
export function gmClearBooster(boosterKey) {
  if (!VALID_BOOSTER_KEYS.includes(boosterKey)) {
    return { success: false, message: `Unknown booster: ${boosterKey}.` };
  }

  state.boosters[boosterKey] = { multiplier: 1, endsAt: 0 };
  saveState();
  return { success: true, message: `${boosterKey} booster cleared.` };
}

/**
 * Build a booster patch object for use with gmApplyToPlayer().
 * Only patches the specific booster key, leaves others intact.
 */
export function buildBoosterPatch(boosterKey, multiplier, durationMinutes) {
  return {
    boosters: {
      [boosterKey]: {
        multiplier: parseFloat(multiplier),
        endsAt:     Date.now() + parseFloat(durationMinutes) * 60 * 1000,
        isGm:       true,
      },
    },
  };
}

/**
 * Build a crate patch object for use with gmApplyToPlayer().
 * mode: "add" | "remove"
 */
export function buildCratePatch(currentCrates, crateId, amount, mode) {
  const current = currentCrates[crateId] || 0;
  const n       = parseInt(amount, 10);

  const newCount = mode === "add"
    ? current + n
    : Math.max(0, current - n);

  return {
    crates: {
      ...currentCrates,
      [crateId]: newCount,
    },
  };
}
