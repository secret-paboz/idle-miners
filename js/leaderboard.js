// ============================================================
// LEADERBOARD.JS — Fetch and submit leaderboard data
// Fixes:
//   - hidden flag is now serverside (Supabase RLS filters it)
//   - is_vip and dimension submitted with score
//   - toggleHidden writes to Supabase, not just local state
// ============================================================

import { state } from "./state.js";
import { getDimension } from "./data/dimensions-data.js";

function getClient() {
  if (!window.supabaseClient) {
    console.warn("Supabase client not ready.");
    return null;
  }
  return window.supabaseClient;
}

// ============================================================
// SECTION 1 — SUBMIT SCORE
// Now includes is_vip, dimension, and hidden flag
// ============================================================

export async function submitLeaderboardScore() {
  if (state.isGuest) return { success: false, message: "Guests can't appear on the leaderboard." };

  const client = getClient();
  if (!client) return { success: false, message: "Not connected to server." };

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, message: "Not logged in." };

    // Fetch current hidden status from DB so we don't accidentally reset it
    const { data: existing } = await client
      .from("leaderboard")
      .select("hidden")
      .eq("id", userId)
      .single();

    const currentHidden = existing?.hidden ?? false;

    const row = {
      id:           userId,
      nickname:     state.nickname,
      rebirths:     state.rebirths,
      blocks_mined: state.blocksMined,
      cash_earned:  state.cashEarned,
      pets_owned:   countOwnedPets(),
      is_vip:       state.isVip && Date.now() < state.vipExpiresAt,
      dimension:    state.dimension || "earth",
      hidden:       currentHidden,   // preserve existing hidden preference
      updated_at:   new Date().toISOString(),
    };

    const { error } = await client
      .from("leaderboard")
      .upsert(row, { onConflict: "id" });

    if (error) return { success: false, message: error.message };
    return { success: true, message: "Leaderboard updated." };

  } catch (err) {
    return { success: false, message: "Failed to submit score." };
  }
}

// ============================================================
// SECTION 2 — FETCH LEADERBOARD
// hidden=false is enforced by Supabase RLS policy —
// hidden rows never come back regardless of who asks.
// No clientside filtering needed anymore.
// ============================================================

export async function fetchLeaderboard(category = "rebirths", limit = 25) {
  const validCategories = ["rebirths", "blocks_mined", "cash_earned", "pets_owned"];
  if (!validCategories.includes(category)) {
    return { success: false, message: "Invalid category.", rows: [] };
  }

  const client = getClient();
  if (!client) return { success: false, message: "Not connected.", rows: [] };

  try {
    const { data, error } = await client
      .from("leaderboard")
      .select("nickname, rebirths, blocks_mined, cash_earned, pets_owned, is_vip, dimension, updated_at")
      .order(category, { ascending: false })
      .limit(limit);
    // Note: hidden rows are filtered by RLS policy on the server.
    // No need to filter clientside.

    if (error) return { success: false, message: error.message, rows: [] };

    const rows = (data || []).map((row, index) => ({
      rank:            index + 1,
      nickname:        row.nickname,
      rebirths:        row.rebirths,
      blocksMined:     row.blocks_mined,
      cashEarned:      row.cash_earned,
      petsOwned:       row.pets_owned,
      isVip:           row.is_vip ?? false,
      dimension:       row.dimension || "earth",
      updatedAt:       row.updated_at,
      isCurrentPlayer: row.nickname === state.nickname,
    }));

    return { success: true, rows, category };

  } catch (err) {
    return { success: false, message: "Failed to fetch leaderboard.", rows: [] };
  }
}

// ============================================================
// SECTION 3 — TOGGLE HIDDEN (serverside fix)
// Writes directly to Supabase so ALL viewers are affected.
// The old version only filtered clientside for the current user.
// ============================================================

export async function toggleLeaderboardVisibility() {
  if (state.isGuest) return { success: false, message: "Guests have no leaderboard entry." };

  const client = getClient();
  if (!client) return { success: false, message: "Not connected." };

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, message: "Not logged in." };

    // Fetch current hidden value from DB
    const { data: existing, error: fetchError } = await client
      .from("leaderboard")
      .select("hidden")
      .eq("id", userId)
      .single();

    if (fetchError || !existing) {
      // No leaderboard entry yet — submit score first then hide
      await submitLeaderboardScore();
      await client
        .from("leaderboard")
        .update({ hidden: true })
        .eq("id", userId);

      // Sync to local state for GM panel display
      state.gmHiddenFromLeaderboard = true;
      return { success: true, hidden: true, message: "You are now hidden from the leaderboard." };
    }

    const newHidden = !existing.hidden;

    const { error: updateError } = await client
      .from("leaderboard")
      .update({ hidden: newHidden })
      .eq("id", userId);

    if (updateError) return { success: false, message: "Failed to update visibility." };

    // Sync to local state so GM panel reflects current status
    state.gmHiddenFromLeaderboard = newHidden;

    return {
      success: true,
      hidden:  newHidden,
      message: newHidden
        ? "You are now hidden from the leaderboard."
        : "You are now visible on the leaderboard.",
    };

  } catch (err) {
    return { success: false, message: "Toggle failed. Please try again." };
  }
}

// ============================================================
// SECTION 4 — FETCH PLAYER RANK
// ============================================================

export async function fetchPlayerRank(category = "rebirths") {
  if (state.isGuest) return { success: false, message: "Guests have no rank." };

  const client = getClient();
  if (!client) return { success: false };

  try {
    const playerValue = getCategoryValue(category);

    const { count, error } = await client
      .from("leaderboard")
      .select("id", { count: "exact", head: true })
      .gt(category, playerValue);

    if (error) return { success: false };

    const { count: total } = await client
      .from("leaderboard")
      .select("id", { count: "exact", head: true });

    return {
      success:  true,
      rank:     (count ?? 0) + 1,
      total:    total ?? 0,
      value:    playerValue,
      category,
    };

  } catch (err) {
    return { success: false };
  }
}

// ============================================================
// SECTION 5 — CATEGORY CONFIG
// ============================================================

export const LEADERBOARD_CATEGORIES = [
  {
    key:         "rebirths",
    label:       "Rebirths",
    icon:        "fa-solid fa-rotate",
    color:       "#ab47bc",
    description: "Most rebirths completed",
    format:      (v) => v.toLocaleString(),
  },
  {
    key:         "blocks_mined",
    label:       "Blocks Mined",
    icon:        "fa-solid fa-hammer",
    color:       "#42a5f5",
    description: "Total blocks mined ever",
    format:      (v) => formatLeaderboardNumber(v),
  },
  {
    key:         "cash_earned",
    label:       "Cash Earned",
    icon:        "fa-solid fa-coins",
    color:       "#ffc107",
    description: "Total cash earned ever",
    format:      (v) => "$" + formatLeaderboardNumber(v),
  },
  {
    key:         "pets_owned",
    label:       "Pets Owned",
    icon:        "fa-solid fa-paw",
    color:       "#4caf50",
    description: "Total pets collected",
    format:      (v) => v.toLocaleString(),
  },
];

export function getRankBadge(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// ============================================================
// SECTION 6 — HELPERS
// ============================================================

function countOwnedPets() {
  return Object.values(state.pets).filter(p => p.owned).length;
}

function getCategoryValue(category) {
  switch (category) {
    case "rebirths":     return state.rebirths;
    case "blocks_mined": return state.blocksMined;
    case "cash_earned":  return state.cashEarned;
    case "pets_owned":   return countOwnedPets();
    default:             return 0;
  }
}

function formatLeaderboardNumber(n) {
  if (n >= 1e15) return (n / 1e15).toFixed(2) + "Q";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + "K";
  return Math.floor(n).toLocaleString();
}
