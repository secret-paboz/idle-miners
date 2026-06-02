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
import { toggleLeaderboardVisibility } from "./leaderboard.js";

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

// ============================================================
// SECTION 2 — LEADERBOARD VISIBILITY TOGGLE
// Now delegates to leaderboard.js which writes to Supabase.
// The old local-only toggle is replaced — hidden is serverside.
// ============================================================

export function isGMHiddenFromLeaderboard() {
  return state.gmHiddenFromLeaderboard === true;
}

// Delegates to leaderboard.js toggleLeaderboardVisibility()
// which writes hidden flag to Supabase so ALL viewers are affected.
export async function toggleGMLeaderboardVisibility() {
  const result = await toggleLeaderboardVisibility();
  return result;
}

// ============================================================
// SECTION 3 — GM ACTIONS
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
