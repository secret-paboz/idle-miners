// ============================================================
// AUTH.JS — Login, register, logout, guest mode
//
// Auth system:
//   Users register with a Player ID + real email + password.
//   Supabase auth uses the real email so password-reset emails
//   actually reach the player.
//   Login is done with email + password.
//   Player ID is stored in user metadata AND player_saves column
//   so GMs can look up players by Player ID string.
// ============================================================

import { state, saveState, SAVE_KEY, GUEST_KEY, DEFAULT_STATE, deepCopy } from "./state.js";
import { isGameMaster } from "./gm.js";

function getClient() {
  if (!window.supabaseClient) {
    console.warn("Supabase client not ready.");
    return null;
  }
  return window.supabaseClient;
}

// ============================================================
// SECTION 1 — PROFANITY FILTER
// ============================================================

const BLOCKED_WORDS = [
  "fuck", "shit", "ass", "bitch", "bastard", "cunt", "dick",
  "cock", "pussy", "nigger", "nigga", "faggot", "fag", "retard",
  "whore", "slut", "rape", "nazi", "hitler", "kill", "sex",
  "porn", "nude", "naked", "penis", "vagina", "boob", "tits",
  "kys", "admin", "moderator", "mod", "staff", "support",
];

export function containsBadWord(str) {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

// ============================================================
// SECTION 2 — VALIDATION HELPERS
// ============================================================

export function validatePlayerId(id) {
  if (!id || id.trim().length < 3)
    return { valid: false, message: "Player ID must be at least 3 characters." };
  if (id.trim().length > 20)
    return { valid: false, message: "Player ID must be 20 characters or less." };
  if (!/^[a-zA-Z0-9_]+$/.test(id.trim()))
    return { valid: false, message: "Player ID can only contain letters, numbers, and underscores." };
  if (containsBadWord(id.trim()))
    return { valid: false, message: "That Player ID is not allowed." };
  return { valid: true };
}

function validateEmail(email) {
  if (!email || !email.trim())
    return { valid: false, message: "Email address is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return { valid: false, message: "Please enter a valid email address." };
  return { valid: true };
}

// ============================================================
// SECTION 3 — GUEST MODE
// ============================================================

export function getOrCreateGuestId() {
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    guestId = "guest_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(GUEST_KEY, guestId);
  }
  return guestId;
}

export function loginAsGuest() {
  const guestId  = getOrCreateGuestId();
  state.isGuest  = true;
  state.isVip    = false;
  state.nickname = guestId;
  saveState();
  return { success: true, isGuest: true, nickname: guestId };
}

// ============================================================
// SECTION 4 — REGISTER (uses real email)
// ============================================================

export async function registerUser(playerId, password, nickname, email) {
  const client = getClient();
  if (!client) return { success: false, message: "Not connected to server." };

  // Validate Player ID
  const idCheck = validatePlayerId(playerId);
  if (!idCheck.valid) return { success: false, message: idCheck.message };

  // Validate nickname
  if (!nickname || nickname.trim().length < 3)
    return { success: false, message: "Nickname must be at least 3 characters." };
  if (nickname.trim().length > 20)
    return { success: false, message: "Nickname must be 20 characters or less." };
  if (!/^[a-zA-Z0-9_ ]+$/.test(nickname.trim()))
    return { success: false, message: "Nickname can only contain letters, numbers, underscores, and spaces." };
  if (containsBadWord(nickname.trim()))
    return { success: false, message: "That nickname is not allowed." };

  // Validate email
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return { success: false, message: emailCheck.message }; 

  // Validate password
  if (!password || password.length < 6)
    return { success: false, message: "Password must be at least 6 characters." };

  try {
    const { data, error } = await client.auth.signUp({
      email:    email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          player_id: playerId.trim().toLowerCase(),
          nickname:  nickname.trim(),
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { success: false, message: "That email is already registered." };
      }
      return { success: false, message: error.message };
    }

    const user = data.user;

    const initialSave = {
      id:             user.id,
      player_id:      playerId.trim().toLowerCase(),
      nickname:       nickname.trim(),
      game_data:      JSON.stringify({ ...state, nickname: nickname.trim(), isGuest: false }),
      updated_at:     new Date().toISOString(),
      is_vip:         false,
      vip_expires_at: 0,
      role:           0,
    };

    const { error: dbError } = await client
      .from("player_saves")
      .insert(initialSave);

    if (dbError) console.warn("player_saves insert failed:", dbError.message);

    state.nickname = nickname.trim();
    state.isGuest  = false;
    state.isVip    = false;
    saveState();

    window.__gmVerified = await isGameMaster();

    return {
      success: true,
      message: `Account created! Welcome, ${nickname.trim()}. Check your email to verify your account.`,
      user,
    };

  } catch (err) {
    return { success: false, message: "Registration failed. Please try again." };
  }
}

// ============================================================
// SECTION 5 — LOGIN (email + password)
// ============================================================

export async function loginUser(email, password) {
  const client = getClient();
  if (!client) return { success: false, message: "Not connected to server." };

  if (!email || !password)
    return { success: false, message: "Please enter your email and password." };

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return { success: false, message: emailCheck.message };

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: password,
    });

    if (error) return { success: false, message: "Invalid email or password." };

    const user   = data.user;
    const loaded = await loadCloudSave(user.id);
    if (!loaded.success) console.warn("Cloud save not found, using local state.");

    window.__gmVerified = await isGameMaster();

    return { success: true, message: `Welcome back, ${state.nickname}!`, user };

  } catch (err) {
    return { success: false, message: "Login failed. Please try again." };
  }
}

// ============================================================
// SECTION 6 — LOGOUT (fixed: wipes local state on logout)
// ============================================================

export async function logoutUser() {
  const client = getClient();

  // 1. Sign out from Supabase first
  if (client) await client.auth.signOut().catch(() => {});

  // 2. Clear GM flag
  window.__gmVerified = false;

  // 3. CRITICAL FIX: wipe localStorage game save so the previous
  //    account's progress cannot be reused or duplicated.
  //    The cloud has the real save — local copy is discarded.
  localStorage.removeItem(SAVE_KEY);

  // 4. Reset in-memory state to clean defaults
  const fresh = deepCopy(DEFAULT_STATE);
  for (const key of Object.keys(state)) {
    delete state[key];
  }
  Object.assign(state, fresh);

  // 5. Create a brand new guest session on the clean state
  const guestId  = getOrCreateGuestId();
  state.isGuest  = true;
  state.isVip    = false;
  state.nickname = guestId;
  saveState();

  return { success: true, message: "Logged out. Playing as guest." };
}

// ============================================================
// SECTION 7 — SESSION RESTORE
// ============================================================

export async function restoreSession() {
  const client = getClient();
  if (!client) return { loggedIn: false };

  try {
    const { data }  = await client.auth.getSession();
    const session   = data?.session;
    if (!session) return { loggedIn: false };

    const user   = session.user;
    const loaded = await loadCloudSave(user.id);

    window.__gmVerified = await isGameMaster();

    return { loggedIn: true, user, saveLoaded: loaded.success };

  } catch (err) {
    return { loggedIn: false };
  }
}

// ============================================================
// SECTION 8 — CLOUD SAVE LOADER (internal)
// ============================================================

async function loadCloudSave(userId) {
  const client = getClient();
  if (!client) return { success: false };

  try {
    const { data, error } = await client
      .from("player_saves")
      .select("nickname, game_data, is_vip, vip_expires_at")
      .eq("id", userId)
      .single();

    if (error || !data) return { success: false };

    const cloudData = typeof data.game_data === "string"
      ? JSON.parse(data.game_data)
      : data.game_data;

    // Server VIP values are authoritative
    const now          = Date.now();
    const vipExpiresAt = data.vip_expires_at ?? 0;
    const isVip        = data.is_vip === true && vipExpiresAt > now;

    // Wipe local state first, then load cloud data cleanly
    // This prevents any leftover guest/previous-account data mixing in
    const fresh = deepCopy(DEFAULT_STATE);
    Object.assign(fresh, cloudData, {
      nickname:      data.nickname,
      isGuest:       false,
      isVip,
      vipExpiresAt,
    });

    for (const key of Object.keys(state)) {
      delete state[key];
    }
    Object.assign(state, fresh);

    saveState();
    return { success: true, nickname: data.nickname };

  } catch (err) {
    return { success: false };
  }
}

// ============================================================
// SECTION 9 — AUTH HELPERS
// ============================================================

export function getAuthStatus() {
  return {
    isGuest:  state.isGuest,
    nickname: state.nickname,
    loggedIn: !state.isGuest,
    isVip:    state.isVip,
  };
}

export function onAuthChange(callback) {
  const client = getClient();
  if (!client) return;
  client.auth.onAuthStateChange((event, session) => {
    callback({ event, session });
  });
}
