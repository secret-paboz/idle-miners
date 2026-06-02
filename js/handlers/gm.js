// ============================================================
// HANDLERS/GM.JS — Game Master panel event handlers
// ============================================================

import {
  toggleGMLeaderboardVisibility,
  gmSetCash, gmSetShards, gmSetOre,
  gmSetLevel, gmSetXP,
  gmSetPickaxe, gmSetBackpack,
  gmSetRebirths, gmSetPrestigeTokens,
  gmSetCashEarned,
} from "../gm.js";
import {
  grantVipByPlayerId,
  revokeVipByPlayerId,
  checkVipByPlayerId,
} from "../supabase.js";
import { showToast } from "../ui/ui-core.js";
import { renderHUD } from "../ui/ui-hud.js";
import { renderMinePanel } from "../ui/ui-mine.js";
import { renderGMPanel } from "../ui/ui-settings.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function bindGMEvents() {
  on("tab-gm",             "click", handleToggleGMModal);
  on("btn-gm-close",       "click", handleToggleGMModal);

  const overlay = document.getElementById("gm-modal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) handleToggleGMModal();
    });
  }

  const settingsPanel = document.getElementById("panel-settings");
  if (settingsPanel) settingsPanel.addEventListener("click", handleGMClick);
}

function handleToggleGMModal() {
  const modal = document.getElementById("gm-modal");
  if (!modal) return;
  const isVisible = modal.style.display === "flex";
  modal.style.display = isVisible ? "none" : "flex";
  if (!isVisible) renderGMPanel();
}

async function handleGMClick(e) {
  if (e.target.id === "btn-gm-lb-toggle") {
    const hidden = toggleGMLeaderboardVisibility();
    showToast(hidden ? "Hidden from leaderboard." : "Visible on leaderboard.", "info", 2000);
    renderGMPanel();
    return;
  }

  if (e.target.id === "btn-gm-grant-vip") {
    await handleGMGrantVip();
    return;
  }

  if (e.target.id === "btn-gm-revoke-vip") {
    await handleGMRevokeVip();
    return;
  }

  if (e.target.id === "btn-gm-check-vip") {
    await handleGMCheckVip();
    return;
  }

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
