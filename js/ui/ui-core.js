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
// CHANGED (globals):
// - Removed window.__gameState and window.__formatNumber reads.
//   Now imports state and formatNumber directly via ES modules.
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMaxCapacity } from "../economy.js";
import { RARITY_CONFIG } from "../data/pets-data.js";

// ============================================================
// SECTION 1 — FAB MENU + PANEL NAVIGATION
// ============================================================

const PANELS = ["mine", "pets", "crates", "prestige", "settings"];

let _fabOpen = false;

// Wire up the FAB hamburger button and all menu items
export function initTabs() {
  const fabBtn   = document.getElementById("btn-fab-menu");
  const fabMenu  = document.getElementById("fab-menu");
  const backdrop = document.getElementById("fab-backdrop");

  if (fabBtn)   fabBtn.addEventListener("click", toggleFabMenu);
  if (backdrop) backdrop.addEventListener("click", closeFabMenu);

  // Wire each menu item by its data-panel attribute
  if (fabMenu) {
    fabMenu.querySelectorAll(".fab-menu-item[data-panel]").forEach(item => {
      item.addEventListener("click", () => {
        const panel = item.dataset.panel;
        if (panel === "leaderboard") {
          closeFabMenu();
          openLeaderboardModal();
        } else if (panel === "gm") {
          closeFabMenu();
          document.getElementById("gm-modal").style.display = "flex";
        } else {
          switchTab(panel);
          closeFabMenu();
        }
      });
    });
  }
}

export function openFabMenu() {
  _fabOpen = true;
  const fabBtn   = document.getElementById("btn-fab-menu");
  const fabMenu  = document.getElementById("fab-menu");
  const backdrop = document.getElementById("fab-backdrop");
  if (fabBtn)   { fabBtn.classList.add("is-open"); fabBtn.setAttribute("aria-expanded", "true"); }
  if (fabMenu)  fabMenu.classList.add("is-open");
  if (backdrop) backdrop.classList.add("is-open");
}

export function closeFabMenu() {
  _fabOpen = false;
  const fabBtn   = document.getElementById("btn-fab-menu");
  const fabMenu  = document.getElementById("fab-menu");
  const backdrop = document.getElementById("fab-backdrop");
  if (fabBtn)   { fabBtn.classList.remove("is-open"); fabBtn.setAttribute("aria-expanded", "false"); }
  if (fabMenu)  fabMenu.classList.remove("is-open");
  if (backdrop) backdrop.classList.remove("is-open");
}

export function toggleFabMenu() {
  _fabOpen ? closeFabMenu() : openFabMenu();
}

// Show/hide the GM menu item based on GM status
export function updateFabGmVisibility() {
  const item = document.getElementById("fab-item-gm");
  const sep  = document.getElementById("fab-sep-gm");
  const show = !!window.__gmVerified;
  if (item) item.style.display = show ? "flex" : "none";
  if (sep)  sep.style.display  = show ? "block" : "none";
}

// Update crate badge count in the menu
export function updateFabCrateBadge(count) {
  const badge = document.getElementById("fab-crate-badge");
  if (!badge) return;
  if (count > 0) {
    badge.textContent   = count;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

export async function switchTab(tabId) {
  // Deactivate all panels
  PANELS.forEach(tab => {
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.remove("active");
  });

  // Activate the requested panel
  const activePanel = document.getElementById(`panel-${tabId}`);
  if (activePanel) activePanel.classList.add("active");

  // Update active state on menu items
  document.querySelectorAll(".fab-menu-item[data-panel]").forEach(item => {
    item.classList.toggle("is-active", item.dataset.panel === tabId);
  });

  // Render panel content
  switch (tabId) {
    case "mine": {
      const { renderMinePanel, renderBoosterBadges } = await import("./ui-mine.js");
      renderMinePanel();
      renderBoosterBadges();
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

// Open leaderboard modal (called from FAB menu + leaderboard handler)
export function openLeaderboardModal() {
  const modal = document.getElementById("leaderboard-modal");
  if (modal) modal.style.display = "flex";
  loadAndRenderLeaderboard("cash_earned");

  // Wire refresh button once
  const refreshBtn = document.getElementById("btn-leaderboard-refresh");
  if (refreshBtn && !refreshBtn._wired) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      refreshBtn.disabled = true;
      await loadAndRenderLeaderboard(_lbCategory);
      refreshBtn.classList.remove("spinning");
      refreshBtn.disabled = false;
    });
    refreshBtn._wired = true;
  }
}

// Category config for tabs
const LB_CATEGORIES = [
  { id: "cash_earned",  label: "Cash",     icon: "fa-solid fa-coins" },
  { id: "blocks_mined", label: "Blocks",   icon: "fa-solid fa-cubes" },
  { id: "rebirths",     label: "Rebirths", icon: "fa-solid fa-rotate" },
  { id: "pets_owned",   label: "Pets",     icon: "fa-solid fa-paw" },
];

let _lbCategory    = "cash_earned";
let _lbFetchedAt   = 0;
let _lbTimerHandle = null;

export async function loadAndRenderLeaderboard(category = "cash_earned") {
  _lbCategory = category;

  // Render tabs
  renderLbTabs(category);

  // Show skeleton while loading
  renderLbSkeleton();

  const { fetchLeaderboard } = await import("../leaderboard.js");
  const result = await fetchLeaderboard(category, 25);

  _lbFetchedAt = Date.now();
  startLbTimestamp();

  renderLbRows(result.rows || [], category);
}

function renderLbTabs(activeCategory) {
  const container = document.getElementById("leaderboard-tabs");
  if (!container) return;
  container.innerHTML = LB_CATEGORIES.map(cat => `
    <div class="lb-tab ${cat.id === activeCategory ? "active" : ""}" data-cat="${cat.id}">
      <i class="${cat.icon}"></i> ${cat.label}
    </div>
  `).join("");

  container.querySelectorAll(".lb-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (tab.dataset.cat !== _lbCategory) {
        loadAndRenderLeaderboard(tab.dataset.cat);
      }
    });
  });
}

function renderLbSkeleton() {
  // Podium skeleton
  const podium = document.getElementById("leaderboard-podium");
  if (podium) {
    podium.innerHTML = [1,2,3].map(() => `
      <div class="lb-podium-card" style="flex:1;gap:6px">
        <div class="lb-skel" style="width:30px;height:22px;border-radius:4px"></div>
        <div class="lb-skel" style="width:54px;height:10px;border-radius:4px;margin-top:4px"></div>
        <div class="lb-skel" style="width:38px;height:10px;border-radius:4px"></div>
      </div>
    `).join("");
  }
  // Row skeletons
  const table = document.getElementById("leaderboard-table");
  if (table) {
    table.innerHTML = [1,2,3,4,5].map(() => `
      <div class="lb-skeleton">
        <div class="lb-skel" style="width:26px;height:26px;border-radius:6px;flex-shrink:0"></div>
        <div class="lb-skel" style="flex:1;height:11px;border-radius:4px"></div>
        <div class="lb-skel" style="width:52px;height:11px;border-radius:4px"></div>
      </div>
    `).join("");
  }
  // Hide your-rank while loading
  const yourRank = document.getElementById("lb-your-rank");
  if (yourRank) yourRank.style.display = "none";
}

function renderLbRows(rows, category) {
  const myNick = state?.nickname || ""; // CHANGED: was window.__gameState

  // ── Podium (top 3) ──────────────────────────────────────
  const podium = document.getElementById("leaderboard-podium");
  if (podium) {
    if (rows.length === 0) {
      podium.innerHTML = "";
    } else {
      const top3     = rows.slice(0, 3);
      const crowns   = ["👑", "", ""];
      const rankNums = ["#1", "#2", "#3"];
      podium.innerHTML = top3.map((row, i) => `
        <div class="lb-podium-card rank-${i+1}">
          ${crowns[i] ? `<div class="lb-podium-crown">${crowns[i]}</div>` : ""}
          <div class="lb-podium-rank">${rankNums[i]}</div>
          <div class="lb-podium-name">${escapeHTML(row.nickname || "—")}</div>
          <div class="lb-podium-value">${escapeHTML(formatLbValue(getCategoryRowValue(row, category), category))}</div>
        </div>
      `).join("");
    }
  }

  // ── Rows 4+ ─────────────────────────────────────────────
  const table = document.getElementById("leaderboard-table");
  if (table) {
    if (rows.length === 0) {
      table.innerHTML = `
        <div class="lb-empty-state">
          <div class="lb-empty-state-icon">🏆</div>
          <div class="lb-empty-state-title">No scores yet</div>
          <div class="lb-empty-state-sub">Be the first to make it onto the leaderboard!</div>
        </div>
      `;
    } else {
      table.innerHTML = rows.slice(3).map((row, i) => {
        const rank  = i + 4;
        const isMe  = myNick && row.nickname === myNick;
        return `
          <div class="lb-row ${isMe ? "is-me" : ""}">
            <div class="lb-rank-badge">${rank}</div>
            <div class="lb-row-name">
              ${escapeHTML(row.nickname || "—")}
              ${isMe ? `<span class="lb-you-tag">YOU</span>` : ""}
            </div>
            <div class="lb-row-value">${escapeHTML(formatLbValue(getCategoryRowValue(row, category), category))}</div>
          </div>
        `;
      }).join("");
    }
  }

  // ── Your rank footer ────────────────────────────────────
  const yourRankEl  = document.getElementById("lb-your-rank");
  const yourRankVal = document.getElementById("lb-your-rank-value");
  if (yourRankEl && yourRankVal) {
    const myIdx = myNick ? rows.findIndex(r => r.nickname === myNick) : -1;
    if (myIdx !== -1) {
      yourRankVal.textContent  = `#${myIdx + 1}`;
      yourRankEl.style.display = "flex";
    } else {
      yourRankEl.style.display = "none";
    }
  }
}

function getCategoryRowValue(row, category) {
  switch (category) {
    case "rebirths":     return row.rebirths    ?? 0;
    case "blocks_mined": return row.blocksMined ?? 0;
    case "cash_earned":  return row.cashEarned  ?? 0;
    case "pets_owned":   return row.petsOwned   ?? 0;
    default:             return 0;
  }
}

function formatLbValue(value, category) {
  // CHANGED: removed window.__formatNumber fallback, formatNumber imported directly
  switch (category) {
    case "cash_earned":  return "$" + formatNumber(value);
    case "blocks_mined": return formatNumber(value);
    case "rebirths":     return value + " ↺";
    case "pets_owned":   return value + " 🐾";
    default:             return String(value);
  }
}

function startLbTimestamp() {
  if (_lbTimerHandle) clearInterval(_lbTimerHandle);
  const el = document.getElementById("lb-updated-at");
  if (!el) return;
  el.textContent = "Updated just now";
  _lbTimerHandle = setInterval(() => {
    const secs = Math.floor((Date.now() - _lbFetchedAt) / 1000);
    if (secs < 60)  el.textContent = `Updated ${secs}s ago`;
    else            el.textContent = `Updated ${Math.floor(secs/60)}m ago`;
  }, 5000);
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
// SECTION 5b — LOGIN SCREEN
// ============================================================

export function showLoginScreen({ onGuest } = {}) {
  const existing = document.getElementById("login-screen");
  if (existing) return;

  const screen     = document.createElement("div");
  screen.id        = "login-screen";
  screen.innerHTML = `
    <div class="login-screen-box">

      <div class="login-screen-logo">
        <i class="fa-solid fa-helmet-safety login-screen-logo-icon"></i>
        <div class="login-screen-title">Idle Miners</div>
        <div class="login-screen-subtitle">Mine. Sell. Prestige. Repeat.</div>
      </div>

      <div class="login-screen-form">
        <input type="text"     id="ls-player-id" placeholder="Player ID"      autocomplete="username" />
        <input type="password" id="ls-password" placeholder="Password"       autocomplete="current-password" />
        <div class="login-screen-message" id="ls-message"></div>
        <button class="login-screen-btn login-screen-btn--primary" id="ls-btn-login">
          <i class="fa-solid fa-right-to-bracket"></i> Log In
        </button>
      </div>

      <div class="login-screen-divider"><span>or</span></div>

      <button class="login-screen-btn login-screen-btn--guest" id="ls-btn-guest">
        <i class="fa-solid fa-user-secret"></i> Play as Guest
      </button>

      <div class="login-screen-links">
        <span>Don't have an account? <a href="#" id="ls-link-register">Register here.</a></span>
        <a href="#" id="ls-link-forgot">Forgot your password?</a>
      </div>

    </div>
  `;

  document.body.appendChild(screen);
  // Trigger fade-in on next frame
  requestAnimationFrame(() => screen.classList.add("visible"));

  // ── Log In ──────────────────────────────────────────────
  document.getElementById("ls-btn-login").addEventListener("click", async () => {
    const playerId = document.getElementById("ls-player-id")?.value?.trim();
    const password = document.getElementById("ls-password")?.value;
    const msgEl    = document.getElementById("ls-message");

    if (!playerId || !password) {
      msgEl.textContent = "Please enter your Player ID and password.";
      return;
    }

    const btn = document.getElementById("ls-btn-login");
    btn.disabled     = true;
    btn.innerHTML    = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in…`;
    msgEl.textContent = "";

    const { loginUser } = await import("../auth.js");
    const result = await loginUser(playerId, password);

    if (result.success) {
      hideLoginScreen();
      const { showToast } = await import("./ui-core.js");
      showToast(result.message, "success", 3000);
    } else {
      msgEl.textContent = result.message;
      btn.disabled      = false;
      btn.innerHTML     = `<i class="fa-solid fa-right-to-bracket"></i> Log In`;
    }
  });

  // ── Guest ────────────────────────────────────────────────
  document.getElementById("ls-btn-guest").addEventListener("click", () => {
    hideLoginScreen();
    if (onGuest) onGuest();
  });

  // ── Register ─────────────────────────────────────────────
  document.getElementById("ls-link-register").addEventListener("click", async (e) => {
    e.preventDefault();
    const { showRegisterModal } = await import("./ui-settings.js");
    showRegisterModal();
  });

  // ── Forgot Password ──────────────────────────────────────
  document.getElementById("ls-link-forgot").addEventListener("click", async (e) => {
    e.preventDefault();
    const { showForgotPasswordModal } = await import("./ui-settings.js");
    showForgotPasswordModal();
  });

  // ── Enter key submits login ──────────────────────────────
  screen.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("ls-btn-login")?.click();
    }
  });
}

export function hideLoginScreen() {
  const screen = document.getElementById("login-screen");
  if (!screen) return;
  screen.classList.add("fade-out");
  setTimeout(() => screen.remove(), 400);
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

// ============================================================
// VIP MODAL
// ============================================================

export function openVipModal() {
  const overlay = document.getElementById("vip-modal");
  if (!overlay) return;

  const now         = Date.now();
  const isActiveVip = state.isVip && state.vipExpiresAt > now;

  const activeEl   = document.getElementById("vip-modal-active");
  const inactiveEl = document.getElementById("vip-modal-inactive");

  if (activeEl)   activeEl.style.display   = isActiveVip ? "block" : "none";
  if (inactiveEl) inactiveEl.style.display = isActiveVip ? "none"  : "block";

  // Populate expiry line for active VIP
  if (isActiveVip) {
    const expiryEl = document.getElementById("vip-modal-expiry");
    if (expiryEl) {
      const expiryDate = new Date(state.vipExpiresAt);
      const dateStr    = expiryDate.toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric"
      });
      const timeStr = expiryDate.toLocaleTimeString(undefined, {
        hour: "2-digit", minute: "2-digit"
      });
      expiryEl.textContent = `Expires on ${dateStr} at ${timeStr}`;
    }
  }

  overlay.style.display = "flex";

  // Wire close button once
  const closeBtn = document.getElementById("btn-vip-modal-close");
  if (closeBtn && !closeBtn._vipWired) {
    closeBtn.addEventListener("click", closeVipModal);
    closeBtn._vipWired = true;
  }

  // Close on backdrop click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeVipModal();
  }, { once: true });
}

export function closeVipModal() {
  const overlay = document.getElementById("vip-modal");
  if (overlay) overlay.style.display = "none";
}
