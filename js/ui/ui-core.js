// ============================================================
// UI-CORE.JS — Shared utilities, tab navigation, toast, modal
// All other UI modules import their helpers from here.
//
// CHANGED (toast system):
// - showToast() now deduplicates: if the same message is
//   already in the queue, it's skipped entirely.
// - If the queue has 3+ items backed up, duration is cut to
//   800ms so rapid upgrades don't create a 30-second backlog.
// - processToastQueue() fade delay reduced from 400ms to 150ms.
//
// CHANGED (offline progress):
// - showOfflineProgress() replaced toast with a proper modal
//   showing time away, blocks mined, and cash earned (VIP).
// - Added showCloudOfflineBanner() / hideCloudOfflineBanner()
//   for persistent "playing offline" warning when Supabase fails.
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

// Max duration used when queue is backed up (3+ items waiting)
const TOAST_DURATION_NORMAL = 2000;
const TOAST_DURATION_FAST   = 800;
const TOAST_FADE_MS         = 150;  // was 400ms

export function showToast(message, type = "info", duration = TOAST_DURATION_NORMAL) {
  // Skip if the exact same message is already queued or showing
  const isDuplicate = toastQueue.some(t => t.message === message);
  if (isDuplicate) return;

  toastQueue.push({ message, type, duration });
  if (!toastShowing) processToastQueue();
}

function processToastQueue() {
  if (!toastQueue.length) { toastShowing = false; return; }
  toastShowing = true;

  // If queue is backed up, use fast duration for next toast
  const backlogged = toastQueue.length >= 3;
  const { message, type, duration } = toastQueue.shift();
  const effectiveDuration = backlogged ? TOAST_DURATION_FAST : duration;

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
    setTimeout(processToastQueue, TOAST_FADE_MS);
  }, effectiveDuration);
}

// ============================================================
// SECTION 3 — MODAL
// ============================================================

export function showModal({ title, message, confirmText = "Confirm", cancelText = "Cancel", danger = false, onConfirm, onCancel }) {
  let modal = document.getElementById("modal-overlay");
  if (!modal) {
    modal    = document.createElement("div");
    modal.id = "modal-overlay";
    document.body.appendChild(modal);
  }

  const iconHtml = danger ? `
    <div class="modal-danger-icon">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
  ` : "";

  modal.innerHTML = `
    <div class="modal-box ${danger ? "modal-danger" : ""}">
      ${iconHtml}
      <h2 class="modal-title">${escapeHTML(title)}</h2>
      <p class="modal-message">${escapeHTML(message)}</p>
      <div class="modal-actions">
        <button class="btn-modal-cancel"  id="modal-cancel">${escapeHTML(cancelText)}</button>
        <button class="btn-modal-confirm ${danger ? "btn-modal-danger" : ""}" id="modal-confirm">${escapeHTML(confirmText)}</button>
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

  // Build human-readable time string
  const totalSecs = result.seconds || 0;
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  let overlay = document.getElementById("offline-modal-overlay");
  if (!overlay) {
    overlay    = document.createElement("div");
    overlay.id = "offline-modal-overlay";
    document.body.appendChild(overlay);
  }

  const cashRow = result.isVip && result.cashEarned > 0 ? `
    <div class="offline-stat">
      <span class="offline-stat-value">$${formatNumber(result.cashEarned)}</span>
      <span class="offline-stat-label">Cash earned</span>
    </div>
  ` : "";

  overlay.innerHTML = `
    <div class="offline-modal">
      <div class="offline-modal-icon">${result.isVip ? "👑" : "⛏️"}</div>
      <div class="offline-modal-title">Welcome back!</div>
      <div class="offline-modal-time">
        Your miner worked for <strong>${escapeHTML(timeStr)}</strong> while you were away
      </div>
      <div class="offline-modal-stats">
        <div class="offline-stat">
          <span class="offline-stat-value">${formatNumber(result.mined)}</span>
          <span class="offline-stat-label">Blocks mined</span>
        </div>
        ${cashRow}
      </div>
      <button class="btn-offline-collect" id="btn-offline-collect">
        <i class="fa-solid fa-hand-holding-dollar"></i> Collect
      </button>
    </div>
  `;

  overlay.classList.add("visible");

  document.getElementById("btn-offline-collect").onclick = () => {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.remove(), 300);
  };
}

// ============================================================
// SECTION 4b — CLOUD OFFLINE BANNER
// ============================================================

export function showCloudOfflineBanner() {
  if (document.getElementById("cloud-offline-banner")) return;

  const banner     = document.createElement("div");
  banner.id        = "cloud-offline-banner";
  banner.innerHTML = `
    <i class="fa-solid fa-cloud-slash"></i>
    <span><strong>Playing offline</strong> — progress saves locally only. Check your connection.</span>
  `;

  // Insert after HUD
  const hud = document.getElementById("hud");
  if (hud && hud.parentNode) {
    hud.parentNode.insertBefore(banner, hud.nextSibling);
  } else {
    document.body.prepend(banner);
  }
}

export function hideCloudOfflineBanner() {
  const banner = document.getElementById("cloud-offline-banner");
  if (banner) banner.remove();
}

// ============================================================
// SECTION 5 — BOOT SPINNER
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
// SECTION 6 — DOM HELPERS
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
