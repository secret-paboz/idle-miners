// ============================================================
// MAIN.JS — Entry point
// Boot sequence, game loop, timed crate awards, event binding
// ============================================================

import { state, initState, saveState } from "./state.js";
import {
  tickMining,
  calculateOfflineProgress,
  formatNumber,
  tryAutoSell,
} from "./economy.js";
import { initTabs, switchTab, showToast, showOfflineProgress, showBootSpinner, hideBootSpinner, updateFabGmVisibility, showLoginScreen } from "./ui/ui-core.js";
import { renderHUD } from "./ui/ui-hud.js";
import { renderMinePanel, animateMiningTick } from "./ui/ui-mine.js";
import { renderPetCooldowns } from "./ui/ui-pets.js";
import { renderCratesPanel, renderCrateTimers } from "./ui/ui-crates.js";
import { renderPrestigePanel } from "./ui/ui-prestige.js";
import { renderSettingsPanel, renderGMPanel } from "./ui/ui-settings.js";
import { initSupabase, cloudLoad, resolveConflict, startAutoSave } from "./supabase.js";
import { restoreSession, loginAsGuest, onAuthChange } from "./auth.js";
import { submitLeaderboardScore } from "./leaderboard.js";
import { addCrate } from "./crates.js";

import { bindMineEvents }        from "./handlers/mine.js";
import { bindPetEvents }         from "./handlers/pets.js";
import { bindPrestigeEvents }    from "./handlers/prestige.js";
import { bindLeaderboardEvents } from "./handlers/leaderboard.js";
import { bindSettingsEvents }    from "./handlers/settings.js";
import { bindGMEvents }          from "./handlers/gm.js";
import { bindDelegatedEvents, handleAuthChange } from "./handlers/auth.js";

// ============================================================
// SECTION 1 — BOOT SEQUENCE
// ============================================================

async function boot() {
  showBootSpinner("Starting up...");

  initSupabase();
  if (!window.supabaseClient) {
    const { showCloudOfflineBanner } = await import("./ui/ui-core.js");
    showCloudOfflineBanner();
  }
  initState();

  const session = await restoreSession();

  if (session.loggedIn) {
    showBootSpinner("Loading save...");
    const winner = await resolveConflict();
    if (winner === "cloud") {
      await cloudLoad();
      showToast("Cloud save loaded.", "info", 3000);
    }
  } else {
    window.__gmVerified = false;
  }

  const offlineResult = calculateOfflineProgress();
  if (offlineResult) showOfflineProgress(offlineResult);

  renderHUD();
  renderGMPanel();
  switchTab("mine");
  initTabs();
  updateFabGmVisibility();
  startGameLoop();
  startAutoSave();
  bindEvents();

  hideBootSpinner();

  // Show login screen for guests / logged-out players
  if (!session.loggedIn) {
    showLoginScreen({
      onGuest: () => {
        if (!state.nickname) loginAsGuest();
        renderHUD();
        renderSettingsPanel();
      },
    });
  }

  // Submit score on startup so leaderboard is current after page reload
  if (!state.isGuest) {
    submitLeaderboardScore().catch(() => {});
  }

  onAuthChange(({ event }) => {
    if (event === "SIGNED_IN")  handleAuthChange("in");
    if (event === "SIGNED_OUT") handleAuthChange("out");
  });

  checkAndAwardTimedCrates();
}

// ============================================================
// SECTION 2 — GAME LOOP
// ============================================================

let gameLoopInterval  = null;
let tickCount         = 0;
const TICK_MS             = 1000;
const RENDER_HUD_EVERY    = 1;   // every tick  — HUD, pet cooldowns, crate timers
const RENDER_MINE_EVERY   = 2;   // every 2s    — mine panel (slightly heavier render)
const SAVE_LOCAL_EVERY    = 30;  // every 30s   — localStorage save
const SUBMIT_LB_EVERY     = 300; // every 5min  — leaderboard score submit
const CRATE_CHECK_EVERY   = 30;  // every 30s   — timed crate award check (timestamps do the real gating)

let lastAutoSellToast = 0;
const AUTO_SELL_TOAST_COOLDOWN = 15 * 1000;

function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);

  gameLoopInterval = setInterval(() => {
    tickCount++;

    const tickResult = tickMining();
    animateMiningTick(tickResult.oreMined, tickResult.oreType);

    if (tickResult.isFull) {
      const autoSell = tryAutoSell();
      if (autoSell.triggered) {
        const now = Date.now();
        if (now - lastAutoSellToast > AUTO_SELL_TOAST_COOLDOWN) {
          showToast(`👑 Auto-sold for $${formatNumber(autoSell.cashEarned)}!`, "success", 2500);
          lastAutoSellToast = now;
        }
      }
    }

    // Render — every 1s
    if (tickCount % RENDER_HUD_EVERY  === 0) renderHUD();
    if (tickCount % RENDER_HUD_EVERY  === 0) renderPetCooldowns();
    if (tickCount % RENDER_HUD_EVERY  === 0) renderCrateTimers();

    // Render — every 2s
    if (tickCount % RENDER_MINE_EVERY === 0) renderMinePanel();

    // Save locally — every 30s
    if (tickCount % SAVE_LOCAL_EVERY  === 0) saveState();

    // Submit leaderboard — every 5min
    if (tickCount % SUBMIT_LB_EVERY === 0 && !state.isGuest) {
      submitLeaderboardScore().catch(() => {});
    }

    // Award timed crates — every 30s (timestamps do the real gating)
    if (tickCount % CRATE_CHECK_EVERY === 0) checkAndAwardTimedCrates();
  }, TICK_MS);
}

// ============================================================
// SECTION 3 — TIMED CRATE AWARDS
// ============================================================

function checkAndAwardTimedCrates() {
  const now = Date.now();

  if (state.lastHourlyTime > 0 && now - state.lastHourlyTime >= 60 * 60 * 1000) {
    addCrate("hourly");
    state.lastHourlyTime = now;
    showToast("Hourly Crate ready!", "success", 3000);
    renderCratesPanel();
  }
  if (state.lastDailyTime > 0 && now - state.lastDailyTime >= 24 * 60 * 60 * 1000) {
    addCrate("daily");
    state.lastDailyTime = now;
    showToast("Daily Crate ready!", "success", 3000);
    renderCratesPanel();
  }
  if (state.lastWeeklyTime > 0 && now - state.lastWeeklyTime >= 7 * 24 * 60 * 60 * 1000) {
    addCrate("weekly");
    state.lastWeeklyTime = now;
    showToast("Weekly Crate ready!", "success", 3000);
    renderCratesPanel();
  }
}

// ============================================================
// SECTION 4 — EVENT BINDING
// ============================================================

function bindEvents() {
  bindMineEvents();
  bindPetEvents();
  bindPrestigeEvents();
  bindLeaderboardEvents();
  bindSettingsEvents();
  bindGMEvents();
  bindDelegatedEvents();

  // Stamp lastOnlineTime whenever the player leaves — this is what
  // makes offline progress work correctly on next boot.
  window.addEventListener("pagehide", () => saveState());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });

  // Mobile fallback: browsers (especially iOS Safari) don't reliably
  // fire pagehide/visibilitychange before killing a tab. Stamp
  // lastOnlineTime every 10s so the worst-case drift is only 10s.
  setInterval(() => { state.lastOnlineTime = Date.now(); }, 10_000);
}

// ============================================================
// SECTION 5 — START
// ============================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
