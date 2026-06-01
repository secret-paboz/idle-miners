// ============================================================
// UI-CORE.JS — Shared utilities, tab navigation, toast, modal
// All other UI modules import their helpers from here.
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMaxCapacity } from "../economy.js";
import { RARITY_CONFIG } from "../data/pets-data.js";

// ============================================================
// SECTION 1 — TAB NAVIGATION
// ============================================================

const TABS = ["mine", "pets", "crates", "prestige", "settings"];

export function initTabs() {
  TABS.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) btn.addEventListener("click", () => switchTab(tab));
  });
}

export async function switchTab(tabId) {
  TABS.forEach(tab => {
    const panel = document.getElementById(`panel-${tab}`);
    const btn   = document.getElementById(`tab-${tab}`);
    if (panel) panel.classList.remove("active");
    if (btn)   btn.classList.remove("active");
  });

  const activePanel = document.getElementById(`panel-${tabId}`);
  const activeBtn   = document.getElementById(`tab-${tabId}`);
  if (activePanel) activePanel.classList.add("active");
  if (activeBtn)   activeBtn.classList.add("active");

  // Lazy import each panel renderer to avoid circular dependencies
  switch (tabId) {
    case "mine": {
      const { renderMinePanel } = await import("./ui-mine.js");
      renderMinePanel();
      break;
    }
    case "pets": {
      const { renderPetsPanel } = await import("./ui-pets.js");
      renderPetsPanel();
      break;
    }
    case "crates": {
      const { renderCratesPanel } = await import("./ui-crates.js");
      renderCratesPanel();
      break;
    }
    case "prestige": {
      const { renderPrestigePanel } = await import("./ui-prestige.js");
      renderPrestigePanel();
      break;
    }
    case "settings": {
      const { renderSettingsPanel } = await import("./ui-settings.js");
      renderSettingsPanel();
      break;
    }
  }
}

export async function loadAndRenderLeaderboard(category = "rebirths") {
  const { renderLeaderboardPanel } = await import("./ui-settings.js");
  const { fetchLeaderboard }       = await import("../leaderboard.js");
  renderLeaderboardPanel([], category, true);
  const result = await fetchLeaderboard(category, 25);
  renderLeaderboardPanel(result.rows || [], category, false);
}

// ============================================================
// SECTION 2 — TOAST
// ============================================================

let toastQueue   = [];
let toastShowing = false;

export function showToast(message, type = "info", duration = 3000) {
  toastQueue.push({ message, type, duration });
  if (!toastShowing) processToastQueue();
}

function processToastQueue() {
  if (!toastQueue.length) { toastShowing = false; return; }
  toastShowing = true;
  const { message, type, duration } = toastQueue.shift();

  let toast = document.getElementById("toast");
  if (!toast) {
    toast    = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className   = `toast toast-${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(processToastQueue, 400);
  }, duration);
}

// ============================================================
// SECTION 3 — MODAL
// ============================================================

export function showModal({ title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel }) {
  let modal = document.getElementById("modal-overlay");
  if (!modal) {
    modal    = document.createElement("div");
    modal.id = "modal-overlay";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-title">${escapeHTML(title)}</h2>
      <p class="modal-message">${escapeHTML(message)}</p>
      <div class="modal-actions">
        <button class="btn-modal-cancel"  id="modal-cancel">${escapeHTML(cancelText)}</button>
        <button class="btn-modal-confirm" id="modal-confirm">${escapeHTML(confirmText)}</button>
      </div>
    </div>
  `;

  modal.classList.add("visible");

  document.getElementById("modal-confirm").onclick = () => {
    modal.classList.remove("visible");
    if (onConfirm) onConfirm();
  };
  document.getElementById("modal-cancel").onclick = () => {
    modal.classList.remove("visible");
    if (onCancel) onCancel();
  };
}

// ============================================================
// SECTION 4 — OFFLINE PROGRESS POPUP
// ============================================================

export function showOfflineProgress(result) {
  if (!result) return;

  if (result.isVip && result.cashEarned > 0) {
    showToast(
      `👑 Welcome back! Mined & sold ${formatNumber(result.mined)} ore in ${result.hours}h — earned $${formatNumber(result.cashEarned)}!`,
      "success",
      6000
    );
  } else {
    showToast(
      `Welcome back! Mined ${formatNumber(result.mined)} ore in ${result.hours}h offline.`,
      "info",
      5000
    );
  }
}

// ============================================================
// SECTION 6 — BOOT SPINNER
// ============================================================

export function showBootSpinner(message = "Loading...") {
  let overlay = document.getElementById("boot-spinner");
  if (!overlay) {
    overlay    = document.createElement("div");
    overlay.id = "boot-spinner";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="boot-spinner-box">
      <div class="boot-spinner-ring"></div>
      <div class="boot-spinner-label">${escapeHTML(message)}</div>
    </div>
  `;
  overlay.classList.add("visible");
}

export function hideBootSpinner() {
  const overlay = document.getElementById("boot-spinner");
  if (!overlay) return;
  overlay.classList.add("fade-out");
  setTimeout(() => overlay.remove(), 400);
}

// ============================================================
// SECTION 5 — DOM HELPERS (exported for use by all UI modules)
// ============================================================

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function setStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}

export function toggleClass(id, cls, condition) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle(cls, condition);
}

export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatCooldown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function categoryToStateKey(category) {
  switch (category) {
    case "rebirths":     return "rebirths";
    case "blocks_mined": return "blocksMined";
    case "cash_earned":  return "cashEarned";
    case "pets_owned":   return "petsOwned";
    default:             return category;
  }
}

export function boosterIcon(key) {
  switch (key) {
    case "miningSpeed": return "fa-solid fa-hammer";
    case "sellValue":   return "fa-solid fa-coins";
    case "xpGain":      return "fa-solid fa-star";
    default:            return "fa-solid fa-bolt";
  }
}

export function boosterLabel(key) {
  switch (key) {
    case "miningSpeed": return "Mining";
    case "sellValue":   return "Sell";
    case "xpGain":      return "XP";
    default:            return key;
  }
}

export function shardCost(rarity) {
  return RARITY_CONFIG[rarity]?.shardCost || "?";
}

export function xpForLevel(level) {
  return Math.floor(50 * Math.pow(level, 2.5));
}

export function pickaxeCost(level) {
  return Math.floor(15 * Math.pow(1.15, level - 1));
}

export function backpackCost(level) {
  return Math.floor(25 * Math.pow(1.15, level - 1));
}
