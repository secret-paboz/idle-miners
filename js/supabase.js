// ============================================================
// SUPABASE.JS — Cloud save gateway
// Initializes the Supabase client and exposes save/load logic
// Must load before auth.js and leaderboard.js
//
// HackShield changes (v2):
//   - cloudSave() now POSTs to api/save.js instead of writing
//     directly to Supabase. The server validates the data and
//     writes using the service role key.
//   - The Supabase anon client is still used for: auth, cloudLoad,
//     resolveConflict, leaderboard, and VIP management (GM only).
// ============================================================

import { state, saveState }              from "./state.js";
import { getSessionToken, hasValidToken, isDevToolsOpen, getSuspicionScore } from "./hackshield.js";

// ============================================================
// SECTION 1 — SUPABASE INITIALIZATION
// ============================================================

const SUPABASE_URL      = window.__ENV__?.SUPABASE_URL      || "";
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || "";

export function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase env vars missing — cloud saves disabled.");
    window.supabaseClient = null;
    return null;
  }

  try {
    const { createClient } = window.supabase;
    if (!createClient) {
      console.warn("Supabase CDN script not loaded.");
      window.supabaseClient = null;
      return null;
    }

    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
      },
    });

    console.log("Supabase client initialized.");
    return window.supabaseClient;

  } catch (err) {
    console.warn("Supabase init failed:", err.message);
    window.supabaseClient = null;
    return null;
  }
}

// ============================================================
// SECTION 2 — CLOUD SAVE (via api/save.js — HackShield)
// No longer writes directly to Supabase from the client.
// All saves are validated server-side before being written.
// ============================================================

export async function cloudSave() {
  // Guests always save locally only — no cloud, no token needed
  if (state.isGuest) {
    saveState();
    return { success: true, message: "Saved locally (guest)." };
  }

  const client = window.supabaseClient;
  if (!client) {
    saveState();
    return { success: false, message: "No cloud connection — saved locally." };
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId  = sessionData?.session?.user?.id;
    const jwt     = sessionData?.session?.access_token;

    if (!userId || !jwt) {
      saveState();
      return { success: false, message: "Not logged in — saved locally." };
    }

    // HackShield: require a valid session token
    if (!hasValidToken()) {
      saveState();
      console.warn("[cloudSave] No valid HackShield token — skipping cloud save.");
      return { success: false, message: "Session token expired. Please reload." };
    }

    // Always save locally first as a backup
    saveState();

    const { token, issuedAt } = getSessionToken();

    // Build the save payload — strip non-serialisable fields
    const gameData = JSON.parse(JSON.stringify(state));

    // Attach HackShield metadata (used by server for logging, not validation)
    gameData.__hs = {
      devTools:  isDevToolsOpen(),
      suspicion: getSuspicionScore(),
    };

    const res = await fetch("/api/save", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({ userId, token, issuedAt, gameData }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      console.warn("[cloudSave] Server rejected save:", result.message, result.errors || "");
      return { success: false, message: result.message || "Cloud save failed — local backup kept." };
    }

    return { success: true, message: "Game saved." };

  } catch (err) {
    saveState();
    console.warn("[cloudSave] Unexpected error:", err.message);
    return { success: false, message: "Cloud save error — saved locally." };
  }
}

// ============================================================
// SECTION 3 — CLOUD LOAD (fetch player_saves)
// Still reads directly via anon client — reads are safe.
// ============================================================

export async function cloudLoad() {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) return { success: false, message: "Not logged in." };

    const { data, error } = await client
      .from("player_saves")
      .select("nickname, game_data, is_vip, vip_expires_at, updated_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return { success: false, message: "No cloud save found." };
    }

    const cloudData = typeof data.game_data === "string"
      ? JSON.parse(data.game_data)
      : data.game_data;

    const now          = Date.now();
    const vipExpiresAt = data.vip_expires_at ?? 0;
    const isVip        = data.is_vip === true && vipExpiresAt > now;

    Object.assign(state, cloudData, {
      nickname:      data.nickname,
      isGuest:       false,
      isVip,
      vipExpiresAt,
    });

    saveState();

    return {
      success:   true,
      message:   "Cloud save loaded.",
      updatedAt: data.updated_at,
    };

  } catch (err) {
    return { success: false, message: "Failed to load cloud save." };
  }
}

// ============================================================
// SECTION 4 — CONFLICT RESOLUTION
// ============================================================

export async function resolveConflict() {
  const client = window.supabaseClient;
  if (!client) return "local";

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return "local";

    const { data } = await client
      .from("player_saves")
      .select("updated_at")
      .eq("id", userId)
      .single();

    if (!data) return "local";

    const cloudTime = new Date(data.updated_at).getTime();
    const localTime = state.lastSaveTime || 0;

    if (cloudTime > localTime + 5000) return "cloud";
    if (localTime > cloudTime + 5000) return "local";
    return "equal";

  } catch {
    return "local";
  }
}

// ============================================================
// SECTION 5 — AUTO SAVE SCHEDULER
// ============================================================

let autoSaveInterval = null;
const AUTO_SAVE_MS   = 60 * 1000;

export function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);

  autoSaveInterval = setInterval(async () => {
    const result = await cloudSave();
    if (!result.success) {
      console.warn("Auto-save:", result.message);
    }
  }, AUTO_SAVE_MS);
}

export function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

// ============================================================
// SECTION 6 — CONNECTION STATUS
// ============================================================

export function getCloudStatus() {
  return {
    connected:  !!window.supabaseClient,
    isGuest:    state.isGuest,
    autoSaving: !!autoSaveInterval,
  };
}

// ============================================================
// SECTION 7 — VIP MANAGEMENT (GM only)
// Still uses anon client — GMs are server-verified (role = 99).
// ============================================================

// Grant VIP to a player by their Player ID string (e.g. "Piererra")
// durationDays: how many days of VIP to grant (stacks on existing time)
// Returns: { success, message }
export async function grantVipByPlayerId(playerId, durationDays) {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  if (!playerId || !playerId.trim())
    return { success: false, message: "Player ID is required." };
  if (!durationDays || durationDays < 1)
    return { success: false, message: "Duration must be at least 1 day." };

  try {
    const cleanId = playerId.trim().toLowerCase();

    const { data, error } = await client
      .from("player_saves")
      .select("id, nickname, is_vip, vip_expires_at")
      .eq("player_id", cleanId)
      .single();

    if (error || !data) {
      return { success: false, message: `Player "${cleanId}" not found.` };
    }

    const now        = Date.now();
    const addMs      = durationDays * 24 * 60 * 60 * 1000;
    const currentExp = (data.is_vip && data.vip_expires_at > now)
      ? data.vip_expires_at
      : now;
    const newExpiry  = currentExp + addMs;

    const { error: updateError } = await client
      .from("player_saves")
      .update({
        is_vip:         true,
        vip_expires_at: newExpiry,
      })
      .eq("id", data.id);

    if (updateError) {
      return { success: false, message: "Failed to update VIP status." };
    }

    const expiryDate = new Date(newExpiry).toLocaleDateString();
    return {
      success: true,
      message: `✅ VIP granted to ${data.nickname} until ${expiryDate}.`,
    };

  } catch (err) {
    return { success: false, message: "VIP grant failed. Please try again." };
  }
}

// Revoke VIP from a player immediately by their Player ID string
// Returns: { success, message }
export async function revokeVipByPlayerId(playerId) {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  if (!playerId || !playerId.trim())
    return { success: false, message: "Player ID is required." };

  try {
    const cleanId = playerId.trim().toLowerCase();

    const { data, error } = await client
      .from("player_saves")
      .select("id, nickname")
      .eq("player_id", cleanId)
      .single();

    if (error || !data) {
      return { success: false, message: `Player "${cleanId}" not found.` };
    }

    const { error: updateError } = await client
      .from("player_saves")
      .update({
        is_vip:         false,
        vip_expires_at: 0,
      })
      .eq("id", data.id);

    if (updateError) {
      return { success: false, message: "Failed to revoke VIP status." };
    }

    return {
      success: true,
      message: `✅ VIP revoked from ${data.nickname}.`,
    };

  } catch (err) {
    return { success: false, message: "VIP revoke failed. Please try again." };
  }
}

// Check VIP status of any player by their Player ID string
// Returns: { success, isVip, nickname, expiresAt, message }
export async function checkVipByPlayerId(playerId) {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  if (!playerId || !playerId.trim())
    return { success: false, message: "Player ID is required." };

  try {
    const cleanId = playerId.trim().toLowerCase();

    const { data, error } = await client
      .from("player_saves")
      .select("nickname, is_vip, vip_expires_at")
      .eq("player_id", cleanId)
      .single();

    if (error || !data) {
      return { success: false, message: `Player "${cleanId}" not found.` };
    }

    const now     = Date.now();
    const isVip   = data.is_vip === true && (data.vip_expires_at ?? 0) > now;
    const expDate = isVip
      ? new Date(data.vip_expires_at).toLocaleDateString()
      : null;

    return {
      success:   true,
      isVip,
      nickname:  data.nickname,
      expiresAt: expDate,
      message:   isVip
        ? `👑 ${data.nickname} is VIP until ${expDate}.`
        : `${data.nickname} has no active VIP.`,
    };

  } catch (err) {
    return { success: false, message: "Check failed. Please try again." };
  }
}
