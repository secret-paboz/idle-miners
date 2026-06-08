// ============================================================
// KEYS.JS — Keyboard shortcuts for PC users
//
// Shortcuts:
//   M          → Mine panel
//   P          → Pets panel
//   C          → Crates panel
//   R          → Prestige/Rebirth panel
//   S          → Settings panel
//   L          → Leaderboard modal
//   Escape     → Close any open modal / FAB menu
//   Space      → Sell ore (if on Mine panel)
//   1–5        → Panels in order (mine, pets, crates, prestige, settings)
//
// Shortcuts are suppressed when:
//   - An <input>, <textarea>, or [contenteditable] is focused
//   - A modal overlay is currently visible
// ============================================================

import { switchTab, closeFabMenu, openLeaderboardModal } from "../ui/ui-core.js";

// Map key → panel id or special action
const KEY_MAP = {
  m: "mine",
  p: "pets",
  c: "crates",
  r: "prestige",
  s: "settings",
  l: "leaderboard",
  1: "mine",
  2: "pets",
  3: "crates",
  4: "prestige",
  5: "settings",
};

// Tooltip element — shown briefly in bottom-left on keypress
let _tooltipEl = null;
let _tooltipTimer = null;

function getOrCreateTooltip() {
  if (_tooltipEl) return _tooltipEl;
  _tooltipEl = document.createElement("div");
  _tooltipEl.id = "kb-tooltip";
  _tooltipEl.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 16px;
    z-index: 9000;
    background: var(--bg-card);
    border: 1px solid var(--border-bright);
    border-radius: var(--radius-md);
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    pointer-events: none;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.15s ease, transform 0.15s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  document.body.appendChild(_tooltipEl);
  return _tooltipEl;
}

function showKeyTooltip(label) {
  const el = getOrCreateTooltip();
  el.innerHTML = `<span style="
    background: var(--bg-secondary);
    border: 1px solid var(--border-bright);
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11px;
    font-family: monospace;
    color: var(--accent);
  ">${label.key}</span> ${label.action}`;
  el.style.opacity   = "1";
  el.style.transform = "translateY(0)";

  clearTimeout(_tooltipTimer);
  _tooltipTimer = setTimeout(() => {
    el.style.opacity   = "0";
    el.style.transform = "translateY(6px)";
  }, 1200);
}

// Check if any modal overlay is open
function isModalOpen() {
  const selectors = [
    "#modal-overlay.visible",
    ".modal-overlay.visible",
    ".lb-modal-overlay",
    ".gm-modal-overlay",
    ".stats-modal-overlay",
    "#forgot-password-modal.visible",
    "#register-modal.visible",
  ];
  return selectors.some(sel => document.querySelector(sel));
}

// Check if user is typing in an input
function isTyping() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" ||
         document.activeElement?.isContentEditable;
}

// Close the topmost open modal
function closeTopModal() {
  // Try ESC on modals in priority order
  const escTargets = [
    ".lb-modal-overlay",
    ".gm-modal-overlay",
    ".stats-modal-overlay",
    "#modal-overlay.visible",
    ".modal-overlay.visible",
  ];
  for (const sel of escTargets) {
    const el = document.querySelector(sel);
    if (el) {
      // Try clicking the close button inside it first
      const closeBtn = el.querySelector(
        ".lb-modal-close, .gm-modal-close, .stats-modal-close, .modal-close, #btn-stats-modal-close"
      );
      if (closeBtn) { closeBtn.click(); return; }
      // Otherwise remove the overlay
      el.remove();
      return;
    }
  }
  // Fall back to closing FAB menu
  closeFabMenu();
}

// Sell ore — triggers btn-sell click if on mine panel
function trySell() {
  const minePanel = document.getElementById("panel-mine");
  if (!minePanel?.classList.contains("active")) return;
  const sellBtn = document.getElementById("btn-sell");
  if (sellBtn && !sellBtn.disabled) {
    sellBtn.click();
    showKeyTooltip({ key: "Space", action: "Sell ore" });
  }
}

async function handleKey(e) {
  // Always allow Escape
  if (e.key === "Escape") {
    closeTopModal();
    return;
  }

  // Suppress everything else when typing or modal open
  if (isTyping() || isModalOpen()) return;

  // Ignore modifier combos (Ctrl+S, Alt+R, etc.)
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const key = e.key.toLowerCase();

  // Space → sell
  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    trySell();
    return;
  }

  const target = KEY_MAP[key];
  if (!target) return;

  e.preventDefault();

  if (target === "leaderboard") {
    openLeaderboardModal();
    showKeyTooltip({ key: e.key.toUpperCase(), action: "Leaderboard" });
    return;
  }

  // Panel names for tooltip
  const PANEL_LABELS = {
    mine:     "Mine",
    pets:     "Pets",
    crates:   "Crates",
    prestige: "Prestige",
    settings: "Settings",
  };

  await switchTab(target);
  showKeyTooltip({ key: e.key.toUpperCase(), action: PANEL_LABELS[target] });
}

export function initKeyboardShortcuts() {
  document.addEventListener("keydown", handleKey);

  // Show a one-time hint on first PC interaction (hover over #app)
  const app = document.getElementById("app");
  if (app && !sessionStorage.getItem("kb-hint-shown")) {
    app.addEventListener("mouseenter", () => {
      if (sessionStorage.getItem("kb-hint-shown")) return;
      sessionStorage.setItem("kb-hint-shown", "1");
      showKeyTooltip({ key: "M/P/C/R/S", action: "Keyboard shortcuts active" });
    }, { once: true });
  }
}
