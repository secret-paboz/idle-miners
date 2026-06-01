// ============================================================
// HACKSHIELD.JS — Client-side integrity guard
// Handles:
//   1. Session token acquisition + refresh (from api/verify.js)
//   2. Action rate limiting (prevent console spam attacks)
//   3. Console tamper detection (detects DevTools open + function overrides)
//   4. State integrity snapshot (detects impossible stat jumps mid-session)
// ============================================================

import { state } from "./state.js";

// ============================================================
// SECTION 1 — SESSION TOKEN
// Fetched once on login, stored in memory only (never localStorage).
// Refreshed automatically before expiry.
// ============================================================

const TOKEN_TTL_MS      = 2 * 60 * 60 * 1000; // Must match api/verify.js
const TOKEN_REFRESH_MS  = 90 * 60 * 1000;      // Refresh at 90 min (before 2h expiry)

let _token     = null;
let _issuedAt  = null;
let _refreshTimer = null;

// Called by main.js after successful login
export async function initHackShield(userId) {
  if (!userId || userId.startsWith("guest_")) {
    // Guests don't get tokens — HackShield is inactive for guests
    _token    = null;
    _issuedAt = null;
    return;
  }

  await _fetchToken(userId);
  _scheduleRefresh(userId);
}

export function getSessionToken() {
  return { token: _token, issuedAt: _issuedAt };
}

export function hasValidToken() {
  if (!_token || !_issuedAt) return false;
  return (Date.now() - _issuedAt) < TOKEN_TTL_MS;
}

async function _fetchToken(userId) {
  try {
    const res = await fetch("/api/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });

    if (!res.ok) {
      console.warn("[HackShield] Token fetch failed:", res.status);
      _token    = null;
      _issuedAt = null;
      return;
    }

    const data = await res.json();
    _token    = data.token;
    _issuedAt = data.issuedAt;

    console.log("[HackShield] Session token acquired.");

  } catch (err) {
    console.warn("[HackShield] Token fetch error:", err.message);
    _token    = null;
    _issuedAt = null;
  }
}

function _scheduleRefresh(userId) {
  if (_refreshTimer) clearTimeout(_refreshTimer);

  _refreshTimer = setTimeout(async () => {
    console.log("[HackShield] Refreshing session token...");
    await _fetchToken(userId);
    _scheduleRefresh(userId); // Schedule next refresh
  }, TOKEN_REFRESH_MS);
}

// Call on logout to clear token from memory
export function clearHackShield() {
  _token        = null;
  _issuedAt     = null;
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = null;
  _resetRateLimits();
  console.log("[HackShield] Session cleared.");
}

// ============================================================
// SECTION 2 — ACTION RATE LIMITER
// Prevents console scripts from calling game functions
// hundreds of times per second.
// Each action has a max call count per rolling time window.
// ============================================================

const RATE_LIMITS = {
  sell:            { max: 5,   windowMs: 3_000  },  // Max 5 sells per 3s
  upgradePickaxe:  { max: 10,  windowMs: 3_000  },  // Max 10 upgrades per 3s
  upgradeBackpack: { max: 10,  windowMs: 3_000  },  // Max 10 upgrades per 3s
  hunt:            { max: 1,   windowMs: 5_000  },  // Max 1 hunt per 5s
  fish:            { max: 1,   windowMs: 5_000  },  // Max 1 fish per 5s
  openCrate:       { max: 20,  windowMs: 5_000  },  // Max 20 crate opens per 5s
  rebirth:         { max: 1,   windowMs: 10_000 },  // Max 1 rebirth per 10s
  prestige:        { max: 1,   windowMs: 10_000 },  // Max 1 prestige per 10s
  upgradePet:      { max: 20,  windowMs: 5_000  },  // Max 20 pet upgrades per 5s
};

// Tracks call timestamps per action
const _actionLog = {};

function _resetRateLimits() {
  for (const key in _actionLog) {
    _actionLog[key] = [];
  }
}

// Returns true if action is allowed, false if rate limited
export function checkRateLimit(actionName) {
  const rule = RATE_LIMITS[actionName];
  if (!rule) return true; // Unknown action — allow by default

  const now  = Date.now();
  const log  = _actionLog[actionName] || [];

  // Remove entries outside the rolling window
  const recent = log.filter(t => now - t < rule.windowMs);

  if (recent.length >= rule.max) {
    console.warn(`[HackShield] Rate limit hit: ${actionName} (${recent.length}/${rule.max} in ${rule.windowMs}ms)`);
    return false;
  }

  recent.push(now);
  _actionLog[actionName] = recent;
  return true;
}

// ============================================================
// SECTION 3 — CONSOLE TAMPER DETECTION
// Detects DevTools open state and warns in logs.
// We don't block the game — just flag it and tighten saves.
// Fully determined cheaters can bypass this; it stops casuals.
// ============================================================

let _devToolsOpen = false;

export function isDevToolsOpen() {
  return _devToolsOpen;
}

function _detectDevTools() {
  // Method 1: window size delta (works on most desktop browsers)
  const threshold = 160;
  const widthDiff  = window.outerWidth  - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;

  if (widthDiff > threshold || heightDiff > threshold) {
    if (!_devToolsOpen) {
      _devToolsOpen = true;
      console.warn("[HackShield] DevTools detected.");
    }
  } else {
    _devToolsOpen = false;
  }
}

// Poll every 3 seconds
let _devToolsTimer = null;
function _startDevToolsMonitor() {
  if (_devToolsTimer) return;
  _devToolsTimer = setInterval(_detectDevTools, 3000);
}

// ============================================================
// SECTION 4 — STATE INTEGRITY SNAPSHOTS
// Takes a snapshot of critical stats periodically.
// If a stat jumps by an impossible amount between snapshots,
// the next save will be flagged as suspicious.
// The server's sanity check is the real gate — this is a
// client-side early warning that also populates save metadata.
// ============================================================

// Max plausible delta per snapshot interval (60s)
const SNAPSHOT_INTERVAL_MS = 60_000;
const MAX_CASH_PER_TICK    = 1e15;  // Extremely generous
const MAX_BLOCKS_PER_MIN   = 60 * 10000; // 10,000 power * 60s

let _lastSnapshot  = null;
let _snapshotTimer = null;
let _suspicionScore = 0;

function _takeSnapshot() {
  if (!state || state.isGuest) return;

  const now = Date.now();

  if (_lastSnapshot) {
    const delta = {
      cash:        state.cash        - _lastSnapshot.cash,
      cashEarned:  state.cashEarned  - _lastSnapshot.cashEarned,
      blocksMined: state.blocksMined - _lastSnapshot.blocksMined,
      rebirths:    state.rebirths    - _lastSnapshot.rebirths,
      pickaxe:     state.pickaxeLevel - _lastSnapshot.pickaxeLevel,
      backpack:    state.backpackLevel - _lastSnapshot.backpackLevel,
    };

    // Flag impossible deltas
    if (delta.cash > MAX_CASH_PER_TICK) {
      _suspicionScore++;
      console.warn(`[HackShield] Suspicious cash delta: +${delta.cash}`);
    }
    if (delta.blocksMined > MAX_BLOCKS_PER_MIN) {
      _suspicionScore++;
      console.warn(`[HackShield] Suspicious blocks delta: +${delta.blocksMined}`);
    }
    if (delta.rebirths > 1) {
      _suspicionScore++;
      console.warn(`[HackShield] Suspicious rebirths delta: +${delta.rebirths}`);
    }
    if (delta.pickaxe > 50) {
      _suspicionScore++;
      console.warn(`[HackShield] Suspicious pickaxe delta: +${delta.pickaxe}`);
    }
    if (delta.backpack > 50) {
      _suspicionScore++;
      console.warn(`[HackShield] Suspicious backpack delta: +${delta.backpack}`);
    }
  }

  _lastSnapshot = {
    cash:         state.cash,
    cashEarned:   state.cashEarned,
    blocksMined:  state.blocksMined,
    rebirths:     state.rebirths,
    pickaxeLevel: state.pickaxeLevel,
    backpackLevel: state.backpackLevel,
    timestamp:    now,
  };
}

function _startSnapshotMonitor() {
  if (_snapshotTimer) return;
  _snapshotTimer = setInterval(_takeSnapshot, SNAPSHOT_INTERVAL_MS);
}

export function getSuspicionScore() {
  return _suspicionScore;
}

export function resetSuspicionScore() {
  _suspicionScore = 0;
}

// ============================================================
// SECTION 5 — BOOT
// Called by main.js after successful login.
// ============================================================

export async function bootHackShield(userId) {
  await initHackShield(userId);
  _startDevToolsMonitor();
  _startSnapshotMonitor();
  console.log("[HackShield] Active.");
}

// ============================================================
// SECTION 6 — EXPORTS SUMMARY
// ============================================================

// bootHackShield(userId)   — call on login
// clearHackShield()        — call on logout
// hasValidToken()          — true if token is alive
// getSessionToken()        — { token, issuedAt } for api/save.js
// checkRateLimit(action)   — returns false if rate limited
// isDevToolsOpen()         — true if DevTools detected
// getSuspicionScore()      — number of flagged anomalies this session
// resetSuspicionScore()    — reset after a clean save
