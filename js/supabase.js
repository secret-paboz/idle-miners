// ============================================================
// SUPABASE.JS — Cloud save gateway
// Initializes the Supabase client and exposes save/load logic
// Must load before auth.js and leaderboard.js
// ============================================================

import { state, saveState } from "./state.js";

// ============================================================
// SECTION 1 — SUPABASE INITIALIZATION
// ============================================================

// SECURITY NOTE: The anon key is intentionally exposed to the client.
// It is a public key — access is governed entirely by Supabase Row Level
// Security (RLS) policies. The service role key (which bypasses RLS) is NEVER
// sent to the client; it lives only in Vercel env vars and is used exclusively
// by the serverless api/save.js validator.
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
// SECTION 2 — CLOUD SAVE (via api/save.js)
// POSTs to the serverless validator which:
//   - Verifies the JWT
//   - Checks player role (GM = skip math validation)
//   - Runs math-based validation for normal players
//   - Writes to Supabase via service role key
// Always saves locally first as a backup.
// ============================================================

export async function cloudSave() {
  // Guests save locally only
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
    const userId = sessionData?.session?.user?.id;
    const jwt    = sessionData?.session?.access_token;

    if (!userId || !jwt) {
      saveState();
      return { success: false, message: "Not logged in — saved locally." };
    }

    // Always save locally first as a backup
    saveState();

    const gameData = JSON.parse(JSON.stringify(state));

    const res = await fetch("/api/save", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({ userId, gameData }),
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
// SECTION 3 — CLOUD LOAD
// Reads directly via anon client — reads are safe.
// VIP status (is_vip, vip_expires_at) is always pulled fresh from Supabase
// here and overrides whatever is in localStorage, preventing client-side
// tampering with VIP expiry.
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
      .select("nickname, player_id, game_data, is_vip, vip_expires_at, updated_at")
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
      nickname:     data.nickname,
      playerId:     data.player_id || "",
      isGuest:      false,
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
// SECTION 3b — CLOUD DELETE
// Wipes the player's game_data in Supabase by nulling it out.
// Called by handleResetSave() for registered accounts.
// ============================================================

export async function deleteCloudSave() {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    const jwt    = sessionData?.session?.access_token;

    if (!userId || !jwt) return { success: false, message: "Not logged in." };

    const res = await fetch("/api/delete", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({ userId }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      console.warn("[deleteCloudSave] Server error:", result.message);
      return { success: false, message: result.message || "Failed to delete cloud save." };
    }

    return { success: true, message: "Cloud save deleted." };

  } catch (err) {
    console.warn("[deleteCloudSave] Unexpected error:", err.message);
    return { success: false, message: "Cloud delete error." };
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
const AUTO_SAVE_MS   = 30 * 1000;  // was 60s — halved to save more frequently

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
// Uses anon client — GMs are server-verified (role = 99).
// ============================================================

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
      .update({ is_vip: true, vip_expires_at: newExpiry })
      .eq("id", data.id);

    if (updateError) {
      return { success: false, message: "Failed to update VIP status." };
    }

    const expiryDate = new Date(newExpiry).toLocaleDateString();
    return { success: true, message: `✅ VIP granted to ${data.nickname} until ${expiryDate}.` };

  } catch {
    return { success: false, message: "VIP grant failed. Please try again." };
  }
}

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
      .update({ is_vip: false, vip_expires_at: 0 })
      .eq("id", data.id);

    if (updateError) {
      return { success: false, message: "Failed to revoke VIP status." };
    }

    return { success: true, message: `✅ VIP revoked from ${data.nickname}.` };

  } catch {
    return { success: false, message: "VIP revoke failed. Please try again." };
  }
}

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
    const expDate = isVip ? new Date(data.vip_expires_at).toLocaleDateString() : null;

    return {
      success:   true,
      isVip,
      nickname:  data.nickname,
      expiresAt: expDate,
      message:   isVip
        ? `👑 ${data.nickname} is VIP until ${expDate}.`
        : `${data.nickname} has no active VIP.`,
    };

  } catch {
    return { success: false, message: "Check failed. Please try again." };
  }
}

// ============================================================
// SECTION 6 — GM PLAYER LOOKUP + REMOTE APPLY
// ============================================================

/**
 * Look up a player by player_id or nickname.
 * Returns their profile + current game_data for GM actions.
 */
export async function lookupPlayer(query) {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  const clean = query.trim().toLowerCase();
  if (!clean) return { success: false, message: "Enter a Player ID or nickname." };

  try {
    // Try player_id first (exact match)
    let { data, error } = await client
      .from("player_saves")
      .select("id, player_id, nickname, is_vip, vip_expires_at, game_data, dimension")
      .eq("player_id", clean)
      .single();

    // Fallback: search by nickname (case-insensitive)
    if (error || !data) {
      const res = await client
        .from("player_saves")
        .select("id, player_id, nickname, is_vip, vip_expires_at, game_data, dimension")
        .ilike("nickname", clean)
        .limit(1)
        .single();
      data  = res.data;
      error = res.error;
    }

    if (error || !data) {
      return { success: false, message: `Player "${clean}" not found.` };
    }

    const now   = Date.now();
    const isVip = data.is_vip === true && (data.vip_expires_at ?? 0) > now;

    const gameData = typeof data.game_data === "string"
      ? JSON.parse(data.game_data)
      : (data.game_data || {});

    return {
      success:    true,
      id:         data.id,
      playerId:   data.player_id,
      nickname:   data.nickname,
      isVip,
      vipExpiry:  data.vip_expires_at,
      dimension:  gameData.dimension  || "earth",
      rebirths:   gameData.rebirths   || 0,
      level:      gameData.level      || 1,
      gameData,
    };
  } catch {
    return { success: false, message: "Lookup failed. Please try again." };
  }
}

/**
 * Apply a partial game_data patch to a target player's cloud save.
 * Used by GM to remotely set values, crates, boosters etc.
 * `patch` is a plain object merged into their existing game_data.
 */
export async function gmApplyToPlayer(targetId, patch) {
  const client = window.supabaseClient;
  if (!client) return { success: false, message: "No cloud connection." };

  try {
    // Load their current game_data
    const { data, error } = await client
      .from("player_saves")
      .select("game_data, nickname")
      .eq("id", targetId)
      .single();

    if (error || !data) {
      return { success: false, message: "Player not found." };
    }

    const existing = typeof data.game_data === "string"
      ? JSON.parse(data.game_data)
      : (data.game_data || {});

    // Deep merge patch into existing — supports nested objects (boosters, crates)
    const merged = _deepMerge(existing, patch);

    const { error: updateError } = await client
      .from("player_saves")
      .update({ game_data: merged })
      .eq("id", targetId);

    if (updateError) {
      return { success: false, message: "Failed to apply changes." };
    }

    return { success: true, message: `Changes applied to ${data.nickname}.` };
  } catch {
    return { success: false, message: "Apply failed. Please try again." };
  }
}

function _deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null
    ) {
      result[key] = _deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
