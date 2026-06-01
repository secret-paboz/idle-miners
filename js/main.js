// ============================================================
// MAIN.JS — Entry point
// Game loop, event listeners, and initialization sequence
// ============================================================

import { state, initState, saveState } from "./state.js";
import {
  tickMining,
  sellOre,
  upgradePickaxe,
  upgradeBackpack,
  doRebirth,
  canRebirth,
  calculateOfflineProgress,
  formatNumber,
  tryAutoSell,
} from "./economy.js";
import { doHunt, doFish } from "./pets.js";
import { openCrate, openAllOfType, addCrate } from "./crates.js";
import { triggerPrestige, purchasePrestigeUpgrade } from "./prestige.js";
import { upgradePet, activateAbility } from "./economy.js";
import { initTabs, switchTab, showToast, showModal, showOfflineProgress, loadAndRenderLeaderboard, showBootSpinner, hideBootSpinner } from "./ui/ui-core.js";
import { renderHUD } from "./ui/ui-hud.js";
import { renderMinePanel, animateMiningTick, animateSell } from "./ui/ui-mine.js";
import { renderPetsPanel } from "./ui/ui-pets.js";
import { renderCratesPanel, animateCrateOpen } from "./ui/ui-crates.js";
import { renderPrestigePanel } from "./ui/ui-prestige.js";
import { renderSettingsPanel, renderGMPanel, showRegisterModal } from "./ui/ui-settings.js";
import {
  initSupabase,
  cloudSave,
  cloudLoad,
  resolveConflict,
  startAutoSave,
  grantVipByPlayerId,
  revokeVipByPlayerId,
  checkVipByPlayerId,
} from "./supabase.js";
import {
  restoreSession,
  loginAsGuest,
  loginUser,
  registerUser,
  logoutUser,
  onAuthChange,
} from "./auth.js";
import { fetchLeaderboard, submitLeaderboardScore } from "./leaderboard.js";
import {
  toggleGMLeaderboardVisibility,
  gmSetCash, gmSetShards, gmSetOre,
  gmSetLevel, gmSetXP,
  gmSetPickaxe, gmSetBackpack,
  gmSetRebirths, gmSetPrestigeTokens,
  gmSetCashEarned,
} from "./gm.js";

// ============================================================
// SECTION 1 — BOOT SEQUENCE
// ============================================================

async function boot() {
  showBootSpinner("Starting up...");

  initSupabase();
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
    if (!state.nickname) loginAsGuest();
    window.__gmVerified = false;
  }

  // Show offline progress toast on login
  const offlineResult = calculateOfflineProgress();
  if (offlineResult) showOfflineProgress(offlineResult);

  renderHUD();
  switchTab("mine");
  initTabs();
  startGameLoop();
  startAutoSave();
  bindEvents();

  hideBootSpinner();

  onAuthChange(({ event }) => {
    if (event === "SIGNED_IN")  handleAuthChange("in");
    if (event === "SIGNED_OUT") handleAuthChange("out");
  });

  checkAndAwardTimedCrates();
}

// ============================================================
// SECTION 2 — GAME LOOP
// ============================================================

let gameLoopInterval   = null;
let tickCount          = 0;
const TICK_MS          = 1000;
const RENDER_HUD_EVERY  = 1;
const RENDER_MINE_EVERY = 2;
const SAVE_LOCAL_EVERY  = 30;
const SUBMIT_LB_EVERY   = 300;

// Throttle auto-sell toast — don't spam it every tick
let lastAutoSellToast = 0;
const AUTO_SELL_TOAST_COOLDOWN = 15 * 1000; // Show toast at most once per 15s

function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);

  gameLoopInterval = setInterval(() => {
    tickCount++;

    const tickResult = tickMining();
    animateMiningTick(tickResult.oreMined, tickResult.oreType);

    // VIP auto-sell: triggers when backpack hits full capacity
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

    if (tickCount % RENDER_HUD_EVERY  === 0) renderHUD();
    if (tickCount % RENDER_MINE_EVERY === 0) renderMinePanel();
    if (tickCount % SAVE_LOCAL_EVERY  === 0) saveState();

    if (tickCount % SUBMIT_LB_EVERY === 0 && !state.isGuest) {
      submitLeaderboardScore().catch(() => {});
    }

    checkAndAwardTimedCrates();

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
// SECTION 4 — EVENT LISTENERS
// ============================================================

function bindEvents() {
  bindMineEvents();
  bindPetEvents();
  bindPrestigeEvents();
  bindLeaderboardEvents();
  bindSettingsEvents();
  bindGMEvents();
  bindDelegatedEvents();
}

// ── Mine ────────────────────────────────────────────────────

function bindMineEvents() {
  on("btn-sell",             "click", handleSell);
  on("btn-upgrade-pickaxe",  "click", handleUpgradePickaxe);
  on("btn-upgrade-backpack", "click", handleUpgradeBackpack);
}

function handleSell() {
  const result = sellOre();
  if (result.cashEarned > 0) {
    animateSell(result.cashEarned);
  } else {
    showToast("Nothing to sell!", "error", 1500);
  }
}

function handleUpgradePickaxe() {
  const result = upgradePickaxe();
  if (result.success) {
    showToast(result.message, "success", 2000);
    renderMinePanel();
    renderHUD();
  } else {
    showToast(result.message, "error", 2000);
  }
}

function handleUpgradeBackpack() {
  const result = upgradeBackpack();
  if (result.success) {
    showToast(result.message, "success", 2000);
    renderMinePanel();
    renderHUD();
  } else {
    showToast(result.message, "error", 2000);
  }
}

// ── Pets ─────────────────────────────────────────────────────

function bindPetEvents() {
  on("btn-hunt", "click", handleHunt);
  on("btn-fish", "click", handleFish);
}

function handleHunt() {
  const result = doHunt();
  if (!result.success) {
    showToast(result.message, "error", 2000);
    return;
  }

  const r = result.result;
  if (r.type === "pet" && r.isNew) {
    showToast(`Found a ${r.petData.name} (${r.petData.rarity})!`, "success", 4000);
  } else if (r.type === "duplicate") {
    showToast(`Already own ${r.petData.name}! Got ${r.shards} shards.`, "info", 3000);
  } else if (r.type === "shards") {
    showToast(`Hunt returned ${r.amount} shards.`, "info", 2000);
  } else {
    showToast("Nothing found this time...", "info", 2000);
  }

  renderPetsPanel();
  renderHUD();
}

function handleFish() {
  const result = doFish();
  if (!result.success) {
    showToast(result.message, "error", 2000);
    return;
  }
  showToast(result.message, "info", 2000);
  renderPetsPanel();
  renderHUD();
}

// ── Prestige ─────────────────────────────────────────────────

function bindPrestigeEvents() {
  on("btn-rebirth",  "click", handleRebirth);
  on("btn-prestige", "click", handlePrestige);
}

function handleRebirth() {
  if (!canRebirth()) {
    showToast("Not ready to rebirth yet.", "error", 2000);
    return;
  }
  showModal({
    title:       "Rebirth?",
    message:     "This resets your cash, ore, level, and gear — but keeps pets, crates, and shards. You'll earn +10% sell value permanently.",
    confirmText: "Rebirth",
    cancelText:  "Cancel",
    onConfirm:   () => {
      const result = doRebirth();
      if (result.success) {
        showToast(result.message, "success", 4000);
        submitLeaderboardScore().catch(() => {});
        renderHUD();
        renderMinePanel();
        renderPrestigePanel();
      }
    },
  });
}

function handlePrestige() {
  showModal({
    title:       "Prestige?",
    message:     "This resets EVERYTHING including rebirths. You'll receive 1 Prestige Token to spend in the shop.",
    confirmText: "Prestige",
    cancelText:  "Cancel",
    onConfirm:   () => {
      const result = triggerPrestige();
      if (result.success) {
        showToast(result.message, "success", 4000);
        submitLeaderboardScore().catch(() => {});
        renderHUD();
        renderMinePanel();
        renderPrestigePanel();
      } else {
        showToast(result.message, "error", 2000);
      }
    },
  });
}

// ── Leaderboard (floating button + modal) ────────────────────

let currentLbCategory = "rebirths";

function bindLeaderboardEvents() {
  // Floating button opens modal
  on("btn-leaderboard-float", "click", handleOpenLeaderboard);

  // Close button
  on("btn-leaderboard-close", "click", handleCloseLeaderboard);

  // Overlay click to close
  const overlay = document.getElementById("leaderboard-modal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) handleCloseLeaderboard();
    });
  }

  // Tab clicks inside modal (delegated to leaderboard-tabs)
  on("leaderboard-tabs", "click", handleLeaderboardTabClick);
}

function handleOpenLeaderboard() {
  const modal = document.getElementById("leaderboard-modal");
  if (modal) modal.style.display = "flex";
  loadAndRenderLeaderboard(currentLbCategory);
}

function handleCloseLeaderboard() {
  const modal = document.getElementById("leaderboard-modal");
  if (modal) modal.style.display = "none";
}

async function handleLeaderboardTabClick(e) {
  const btn = e.target.closest("[data-lb-category]");
  if (!btn) return;
  currentLbCategory = btn.dataset.lbCategory;
  await loadAndRenderLeaderboard(currentLbCategory);
}

// ── Settings ──────────────────────────────────────────────────

function bindSettingsEvents() {
  on("btn-force-save", "click", handleForceSave);
  on("btn-reset-save", "click", handleResetSave);
}

async function handleForceSave() {
  // Guest accounts cannot cloud save — show clear error instead of silent fail
  if (state.isGuest) {
    showToast("❌ Cloud saves require a registered account. Register to keep your progress!", "error", 4000);
    return;
  }
  const result = await cloudSave();
  showToast(result.success ? "✅ Game saved!" : "⚠️ Saved locally only.", result.success ? "success" : "error", 2500);
}

function handleResetSave() {
  showModal({
    title:       "Delete Save Data?",
    message:     "This permanently wipes ALL your progress — cash, gear, pets, everything. This cannot be undone.",
    confirmText: "Delete Everything",
    cancelText:  "Cancel",
    onConfirm:   () => {
      localStorage.clear();
      showToast("Save data deleted. Reloading...", "info", 2000);
      setTimeout(() => location.reload(), 2000);
    },
  });
}

// ── GM ────────────────────────────────────────────────────────

function bindGMEvents() {
  const settingsPanel = document.getElementById("panel-settings");
  if (!settingsPanel) return;
  settingsPanel.addEventListener("click", handleGMClick);
}

async function handleGMClick(e) {
  // Leaderboard visibility toggle
  if (e.target.id === "btn-gm-lb-toggle") {
    const hidden = toggleGMLeaderboardVisibility();
    showToast(hidden ? "Hidden from leaderboard." : "Visible on leaderboard.", "info", 2000);
    renderGMPanel();
    return;
  }

  // VIP grant
  if (e.target.id === "btn-gm-grant-vip") {
    await handleGMGrantVip();
    return;
  }

  // VIP revoke
  if (e.target.id === "btn-gm-revoke-vip") {
    await handleGMRevokeVip();
    return;
  }

  // VIP check
  if (e.target.id === "btn-gm-check-vip") {
    await handleGMCheckVip();
    return;
  }

  // Stat set actions
  const setBtn = e.target.closest("[data-gm-action]");
  if (!setBtn) return;

  const action = setBtn.dataset.gmAction;
  const input  = document.getElementById(`gm-input-${action}`);
  const value  = input?.value?.trim();
  const msgEl  = document.getElementById("gm-message");

  if (!value && value !== "0") {
    if (msgEl) msgEl.textContent = "Enter a value first.";
    return;
  }

  const actions = {
    cash:       () => gmSetCash(value),
    shards:     () => gmSetShards(value),
    ore:        () => gmSetOre(value),
    level:      () => gmSetLevel(value),
    xp:         () => gmSetXP(value),
    pickaxe:    () => gmSetPickaxe(value),
    backpack:   () => gmSetBackpack(value),
    rebirths:   () => gmSetRebirths(value),
    ptokens:    () => gmSetPrestigeTokens(value),
    cashearned: () => gmSetCashEarned(value),
  };

  const fn = actions[action];
  if (!fn) return;

  const result = fn();
  if (msgEl) {
    msgEl.textContent = result.message;
    msgEl.style.color = result.success ? "#4caf50" : "#f44336";
  }

  if (result.success) {
    if (input) input.value = "";
    renderHUD();
    renderMinePanel();
    renderGMPanel();
  }
}

// ── GM VIP Handlers ───────────────────────────────────────────

async function handleGMGrantVip() {
  const playerIdInput = document.getElementById("gm-vip-playerid");
  const daysInput     = document.getElementById("gm-vip-days");
  const msgEl         = document.getElementById("gm-vip-message");

  const playerId = playerIdInput?.value?.trim();
  const days     = parseInt(daysInput?.value?.trim(), 10);

  if (!playerId) {
    if (msgEl) { msgEl.textContent = "Enter a Player ID."; msgEl.style.color = "#f44336"; }
    return;
  }
  if (!days || days < 1) {
    if (msgEl) { msgEl.textContent = "Enter a valid number of days (min 1)."; msgEl.style.color = "#f44336"; }
    return;
  }

  if (msgEl) { msgEl.textContent = "Granting VIP..."; msgEl.style.color = "#aaa"; }

  const result = await grantVipByPlayerId(playerId, days);

  if (msgEl) {
    msgEl.textContent = result.message;
    msgEl.style.color = result.success ? "#4caf50" : "#f44336";
  }

  if (result.success) {
    if (playerIdInput) playerIdInput.value = "";
    if (daysInput)     daysInput.value     = "";
  }
}

async function handleGMRevokeVip() {
  const playerIdInput = document.getElementById("gm-vip-playerid");
  const msgEl         = document.getElementById("gm-vip-message");

  const playerId = playerIdInput?.value?.trim();

  if (!playerId) {
    if (msgEl) { msgEl.textContent = "Enter a Player ID to revoke."; msgEl.style.color = "#f44336"; }
    return;
  }

  if (msgEl) { msgEl.textContent = "Revoking VIP..."; msgEl.style.color = "#aaa"; }

  const result = await revokeVipByPlayerId(playerId);

  if (msgEl) {
    msgEl.textContent = result.message;
    msgEl.style.color = result.success ? "#4caf50" : "#f44336";
  }

  if (result.success && playerIdInput) playerIdInput.value = "";
}

async function handleGMCheckVip() {
  const playerIdInput = document.getElementById("gm-vip-playerid");
  const msgEl         = document.getElementById("gm-vip-message");

  const playerId = playerIdInput?.value?.trim();

  if (!playerId) {
    if (msgEl) { msgEl.textContent = "Enter a Player ID to check."; msgEl.style.color = "#f44336"; }
    return;
  }

  if (msgEl) { msgEl.textContent = "Checking..."; msgEl.style.color = "#aaa"; }

  const result = await checkVipByPlayerId(playerId);

  if (msgEl) {
    msgEl.textContent = result.message;
    msgEl.style.color = result.success
      ? (result.isVip ? "#ffd700" : "#aaa")
      : "#f44336";
  }
}

// ── Delegated events (dynamic DOM) ───────────────────────────

function bindDelegatedEvents() {
  document.addEventListener("click", handleDelegatedClick);
}

async function handleDelegatedClick(e) {
  // Show register modal
  if (e.target.id === "btn-show-register") {
    e.preventDefault();
    showRegisterModal();
    return;
  }

  // Close register modal
  if (e.target.id === "btn-close-register") {
    const modal = document.getElementById("register-modal");
    if (modal) modal.remove();
    return;
  }

  // Login
  if (e.target.id === "btn-login") {
    await handleLogin();
    return;
  }

  // Register (inside modal)
  if (e.target.id === "btn-register") {
    await handleRegister();
    return;
  }

  // Logout
  if (e.target.id === "btn-logout") {
    await handleLogout();
    return;
  }

  // Dimension switch
  const dimBtn = e.target.closest("[data-dim]");
  if (dimBtn && !dimBtn.disabled) {
    const { switchDimension } = await import("./economy.js");
    const result = switchDimension(dimBtn.dataset.dim);
    if (result.success) {
      renderMinePanel();
      renderHUD();
      applyDimensionTheme(dimBtn.dataset.dim);
    }
    return;
  }

  // Open single crate
  const crateBtn = e.target.closest("[data-crate]");
  if (crateBtn && !crateBtn.disabled) {
    const result = openCrate(crateBtn.dataset.crate);
    animateCrateOpen(result);
    return;
  }

  // Open all of one crate type
  const crateAllBtn = e.target.closest("[data-crate-all]");
  if (crateAllBtn && !crateAllBtn.disabled) {
    const results = openAllOfType(crateAllBtn.dataset.crateAll);
    const last    = results[results.length - 1];
    if (last) animateCrateOpen(last);
    showToast(`Opened ${results.length} crates!`, "success", 3000);
    renderCratesPanel();
    return;
  }

  // Claim timed crate
  const claimBtn = e.target.closest("[data-claim]");
  if (claimBtn && !claimBtn.disabled) {
    renderCratesPanel();
    return;
  }

  // Upgrade pet
  const petUpgradeBtn = e.target.closest("[data-pet-upgrade]");
  if (petUpgradeBtn) {
    const result = upgradePet(petUpgradeBtn.dataset.petUpgrade);
    showToast(result.message, result.success ? "success" : "error", 2000);
    renderPetsPanel();
    renderHUD();
    return;
  }

  // Activate legendary pet ability
  const abilityBtn = e.target.closest("[data-pet-ability]");
  if (abilityBtn) {
    const result = activateAbility(abilityBtn.dataset.petAbility);
    showToast(result.message, result.success ? "success" : "error", result.success ? 3000 : 2000);
    renderPetsPanel();
    return;
  }

  // Buy prestige upgrade
  const prestigeBtn = e.target.closest("[data-prestige-upgrade]");
  if (prestigeBtn && !prestigeBtn.disabled) {
    const result = purchasePrestigeUpgrade(prestigeBtn.dataset.prestigeUpgrade);
    showToast(result.message, result.success ? "success" : "error", 2000);
    renderPrestigePanel();
    renderHUD();
    return;
  }
}

// ============================================================
// SECTION 5 — AUTH HANDLERS
// ============================================================

async function handleLogin() {
  const email    = document.getElementById("input-login-email")?.value?.trim();
  const password = document.getElementById("input-login-password")?.value;
  const msgEl    = document.getElementById("login-message");

  if (!email || !password) {
    if (msgEl) msgEl.textContent = "Please enter your email and password.";
    return;
  }

  if (msgEl) msgEl.textContent = "Logging in...";

  const result = await loginUser(email, password);

  if (result.success) {
    showToast(result.message, "success", 3000);
    renderHUD();
    renderSettingsPanel();
  } else {
    if (msgEl) msgEl.textContent = result.message;
    showToast(result.message, "error", 3000);
  }
}

async function handleRegister() {
  const playerId  = document.getElementById("input-reg-playerid")?.value?.trim();
  const nickname  = document.getElementById("input-reg-nickname")?.value?.trim();
  const email     = document.getElementById("input-reg-email")?.value?.trim();
  const password  = document.getElementById("input-reg-password")?.value;
  const password2 = document.getElementById("input-reg-password2")?.value;
  const msgEl     = document.getElementById("register-message");

  if (!playerId || !nickname || !email || !password || !password2) {
    if (msgEl) msgEl.textContent = "Please fill in all fields.";
    return;
  }

  if (password !== password2) {
    if (msgEl) msgEl.textContent = "Passwords do not match.";
    return;
  }

  if (msgEl) msgEl.textContent = "Creating account...";

  const result = await registerUser(playerId, password, nickname, email);

  if (result.success) {
    showToast(result.message, "success", 6000);
    const modal = document.getElementById("register-modal");
    if (modal) modal.remove();
    renderHUD();
    renderSettingsPanel();
  } else {
    if (msgEl) msgEl.textContent = result.message;
  }
}

async function handleLogout() {
  showModal({
    title:       "Log Out?",
    message:     "Your progress is saved. You'll continue as a guest.",
    confirmText: "Log Out",
    cancelText:  "Cancel",
    onConfirm:   async () => {
      await logoutUser();
      showToast("Logged out.", "info", 2000);
      renderHUD();
      renderSettingsPanel();
    },
  });
}

async function handleAuthChange(direction) {
  if (direction === "in") {
    const winner = await resolveConflict();
    if (winner === "cloud") await cloudLoad();
    renderHUD();
    renderSettingsPanel();
  } else {
    loginAsGuest();
    renderHUD();
    renderSettingsPanel();
  }
}

// ============================================================
// SECTION 6 — DIMENSION THEME
// ============================================================

function applyDimensionTheme(dimensionId) {
  document.body.className = document.body.className
    .replace(/\bdim-\S+/g, "")
    .trim();
  document.body.classList.add(`dim-${dimensionId}`);
}

// ============================================================
// SECTION 7 — UTILITY
// ============================================================

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// ============================================================
// SECTION 8 — START
// ============================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
