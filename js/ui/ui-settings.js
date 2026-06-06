// ============================================================
// UI-SETTINGS.JS — Settings panel, leaderboard, register modal,
//                  and GM panel renderers
// ============================================================

import { state } from "../state.js";
import { getAuthStatus } from "../auth.js";
import { LEADERBOARD_CATEGORIES, getRankBadge } from "../leaderboard.js";
import { isGameMasterSync } from "../gm.js";
import { getDimension } from "../data/dimensions-data.js";
import {
  escapeHTML,
  categoryToStateKey,
  setText,
  showToast,
} from "./ui-core.js";

// ============================================================
// SECTION 1 — SETTINGS PANEL
// ============================================================

export function renderSettingsPanel() {
  const auth        = getAuthStatus();
  const authSection = document.getElementById("settings-auth");
  if (!authSection) return;

  if (auth.loggedIn) {
    authSection.innerHTML = `
      <div class="settings-logged-in-wrap">
        <div class="settings-user-row">
          <div class="settings-user">
            <i class="fa-solid fa-user-check"></i>
            <span>Logged in as <strong>${escapeHTML(auth.nickname)}</strong></span>
          </div>
          <button class="btn-logout" id="btn-logout">
            <i class="fa-solid fa-right-from-bracket"></i> Log Out
          </button>
        </div>
      </div>
    `;
  } else {
    authSection.innerHTML = `
      <div class="settings-guest">
        <div class="settings-guest-label">
          <i class="fa-solid fa-user"></i>
          Playing as guest — progress saved locally only.
        </div>
        <div class="auth-form" id="form-login">
          <h3>Log In</h3>
          <input type="email"    id="input-login-email"    placeholder="Email address" autocomplete="email">
          <input type="password" id="input-login-password" placeholder="Password"      autocomplete="current-password">
          <button class="btn-auth" id="btn-login">Log In</button>
          <div class="auth-message" id="login-message"></div>
          <div class="auth-switch">
            Don't have an account?
            <a href="javascript:void(0)" id="btn-show-register">Register here!</a>
          </div>
        </div>
      </div>
    `;
  }

  // Directly bind the register link after rendering, so it always works
  // regardless of event delegation timing
  const regLink = document.getElementById("btn-show-register");
  if (regLink) {
    regLink.addEventListener("click", (e) => {
      e.preventDefault();
      showRegisterModal();
    });
  }

}

// ============================================================
// SECTION 2 — REGISTER MODAL
// ============================================================

export function showRegisterModal() {
  const existing = document.getElementById("register-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id        = "register-modal";
  overlay.className = "modal-overlay visible";

  overlay.innerHTML = `
    <div class="modal-box register-modal-box">
      <h2 class="modal-title">Create Account</h2>

      <div class="register-fields">
        <input type="text"     id="input-reg-playerid"  placeholder="Player ID (3–20 chars, letters/numbers/_)" maxlength="20" autocomplete="username">
        <input type="text"     id="input-reg-nickname"  placeholder="Nickname (3–20 chars)" maxlength="20">
        <input type="email"    id="input-reg-email"     placeholder="Email address" autocomplete="email">
        <input type="password" id="input-reg-password"  placeholder="Password (min 6 chars)" autocomplete="new-password">
        <input type="password" id="input-reg-password2" placeholder="Re-enter Password" autocomplete="new-password">
      </div>

      <div class="auth-message" id="register-message"></div>

      <div class="modal-actions">
        <button class="btn-modal-cancel"  id="btn-close-register">Cancel</button>
        <button class="btn-modal-confirm" id="btn-register">Register</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });
}

// ============================================================
// SECTION 2b — FORGOT PASSWORD MODAL
// ============================================================

export function showForgotPasswordModal() {
  const existing = document.getElementById("forgot-password-modal");
  if (existing) { existing.classList.add("visible"); return; }

  const modal = document.createElement("div");
  modal.id        = "forgot-password-modal";
  modal.className = "visible";

  modal.innerHTML = `
    <div class="forgot-password-box">
      <div class="forgot-password-title">
        <i class="fa-solid fa-key"></i> Reset Password
      </div>
      <div class="forgot-password-desc">
        Enter your email address and we'll send you a link to reset your password.
      </div>
      <input type="email" id="fp-email" placeholder="Email address" autocomplete="email" />
      <div class="fp-message auth-message" id="fp-message"></div>
      <div class="forgot-password-actions">
        <button class="fp-btn-cancel" id="fp-btn-cancel">Cancel</button>
        <button class="fp-btn-send"   id="fp-btn-send">Send Reset Link</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("fp-btn-cancel").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

// Avatar color palette — deterministic from nickname
const AVATAR_COLORS = [
  ["#f5a623","#1a1200"], ["#4caf50","#001a02"], ["#42a5f5","#001020"],
  ["#ab47bc","#130018"], ["#ef5350","#1a0000"], ["#26c6da","#001518"],
  ["#ffa726","#1a0e00"], ["#66bb6a","#001a04"],
];

function getAvatarStyle(nickname) {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) hash = (hash * 31 + nickname.charCodeAt(i)) >>> 0;
  const [fg, bg] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return `background:${bg};color:${fg};border:1.5px solid ${fg}40;`;
}

// Collapse state — persists across re-renders in the same session
window.__gmCollapsed = window.__gmCollapsed || {
  lookup:    false, // Player Lookup stays open — it's the entry point
  setvalues: true,
  crates:    true,
  buffs:     true,
  vip:       true,
  log:       true,
};

function cardHeader(id, icon, label, extra = "") {
  const collapsed = window.__gmCollapsed[id] ? "collapsed" : "";
  return `
    <div class="gm-card ${collapsed}" id="gm-card-${id}">
      <div class="gm-card-header" data-gm-toggle="${id}">
        <i class="${icon}"></i> ${label}
        ${extra}
        <i class="fa-solid fa-chevron-down gm-card-chevron"></i>
      </div>
      <div class="gm-card-body">
  `;
}

function cardClose() { return `</div></div>`; }

export function renderGMPanel() {
  const container = document.getElementById("gm-panel-content");
  if (!isGameMasterSync()) return;
  if (!container) return;

  const target = window.__gmTarget || null;

  // ── Build booster rows ──
  const boosterDefs = [
    { key: "miningSpeed", label: "Mining Speed", icon: "fa-solid fa-bolt",  color: "#42a5f5" },
    { key: "sellValue",   label: "Sell Value",   icon: "fa-solid fa-coins", color: "#ffc107" },
    { key: "xpGain",      label: "XP Gain",      icon: "fa-solid fa-star",  color: "#ab47bc" },
  ];

  const boosterRows = boosterDefs.map(({ key, label, icon, color }) => {
    const src      = target?.gameData?.boosters?.[key] || {};
    const isActive = (src.endsAt || 0) > Date.now();
    const minsLeft = isActive ? Math.ceil((src.endsAt - Date.now()) / 60000) : 0;
    return `
      <div class="gm-booster-row">
        <div class="gm-booster-label">
          <i class="${icon}" style="color:${color}"></i> ${label}
          <span class="gm-booster-status ${isActive ? "active" : "inactive"}">
            ${isActive ? `${src.multiplier}x &middot; ${minsLeft}m left ${src.isGm ? "(GM)" : ""}` : "Off"}
          </span>
        </div>
        <div class="gm-quick-actions">
          <button class="btn-gm-quick" data-gm-quick-boost="${key}" data-mult="2"  data-mins="30">2x/30m</button>
          <button class="btn-gm-quick" data-gm-quick-boost="${key}" data-mult="5"  data-mins="60">5x/1h</button>
          <button class="btn-gm-quick" data-gm-quick-boost="${key}" data-mult="10" data-mins="60">10x/1h</button>
        </div>
        <div class="gm-booster-inputs">
          <input class="gm-input" id="gm-booster-mult-${key}" type="number" min="1" max="100" placeholder="×" title="Multiplier" inputmode="numeric">
          <input class="gm-input" id="gm-booster-mins-${key}" type="number" min="1" max="1440" placeholder="min" title="Minutes" inputmode="numeric">
          <button class="btn-gm-apply" data-gm-booster="${key}">Set</button>
          <button class="btn-gm-clear" data-gm-booster-clear="${key}">✕</button>
        </div>
      </div>
    `;
  }).join("");

  // ── Build crate rows ──
  const crateOptions = [
    { id: "common",    label: "Common",    icon: "fa-solid fa-box-open",    color: "#9e9e9e" },
    { id: "rare",      label: "Rare",      icon: "fa-solid fa-gem",         color: "#26c6da" },
    { id: "legendary", label: "Legendary", icon: "fa-solid fa-trophy",      color: "#ffc107" },
    { id: "hourly",    label: "Hourly",    icon: "fa-solid fa-box",         color: "#78909c" },
    { id: "daily",     label: "Daily",     icon: "fa-solid fa-gift",        color: "#42a5f5" },
    { id: "weekly",    label: "Weekly",    icon: "fa-solid fa-crown",       color: "#ab47bc" },
  ];

  const targetCrates = target?.gameData?.crates || {};

  const crateRows = crateOptions.map(({ id, label, icon, color }) => {
    const count = targetCrates[id] || 0;
    return `
      <div class="gm-crate-row">
        <div class="gm-crate-label">
          <i class="${icon}" style="color:${color}"></i>
          <span>${label}</span>
          <span class="gm-crate-count">${count}</span>
        </div>
        <div class="gm-quick-actions">
          <button class="btn-gm-quick" data-gm-quick-crate-add="${id}" data-amount="1">+1</button>
          <button class="btn-gm-quick" data-gm-quick-crate-add="${id}" data-amount="5">+5</button>
          <button class="btn-gm-quick" data-gm-quick-crate-add="${id}" data-amount="10">+10</button>
        </div>
        <div class="gm-crate-inputs">
          <input class="gm-input" id="gm-crate-amt-${id}" type="number" min="1" max="999" placeholder="amount" inputmode="numeric">
          <button class="btn-gm-add"    data-gm-crate-add="${id}">+ Add</button>
          <button class="btn-gm-remove" data-gm-crate-remove="${id}">− Remove</button>
        </div>
      </div>
    `;
  }).join("");

  // ── Build set-value rows ──
  const valueFields = [
    ["Cash",              "cash",       target?.gameData?.cash,          [0, 1e6, 1e9]],
    ["Shards",            "shards",     target?.gameData?.shards,        [0, 100, 1000]],
    ["Ore",               "ore",        target?.gameData?.ore,           [0, 500]],
    ["Player Level",      "level",      target?.gameData?.level,         [1, 50, 100]],
    ["XP",                "xp",         target?.gameData?.xp,            [0]],
    ["Pickaxe Level",     "pickaxe",    target?.gameData?.pickaxeLevel,  [1, 50, 100]],
    ["Backpack Level",    "backpack",   target?.gameData?.backpackLevel, [1, 50, 100]],
    ["Rebirths",          "rebirths",   target?.gameData?.rebirths,      [0, 10, 50]],
    ["Prestige Tokens",   "ptokens",    target?.gameData?.prestigeTokens,[0, 10, 100]],
    ["Total Cash Earned", "cashearned", target?.gameData?.cashEarned,    [0]],
  ];

  const setValueRows = valueFields.map(([label, action, current, quickVals]) => {
    const quickBtns = quickVals.map(v => {
      const display = v >= 1e9 ? `${v/1e9}B` : v >= 1e6 ? `${v/1e6}M` : v >= 1e3 ? `${v/1e3}K` : String(v);
      return `<button class="btn-gm-quick" data-gm-quick-set="${action}" data-value="${v}">${display}</button>`;
    }).join("");
    const fmt = current !== undefined
      ? (current >= 1e9 ? `${(current/1e9).toFixed(1)}B` : current >= 1e6 ? `${(current/1e6).toFixed(1)}M` : current >= 1e3 ? `${(current/1e3).toFixed(1)}K` : String(current))
      : "—";
    return `
      <div class="gm-row">
        <div class="gm-row-label">${label}</div>
        <div class="gm-quick-actions">${quickBtns}</div>
        <div class="gm-row-controls">
          <span class="gm-row-current">${fmt}</span>
          <input class="gm-input" id="gm-input-${action}" type="number" min="0" placeholder="new value" inputmode="numeric">
          <button class="btn-gm-set" data-gm-action="${action}">Set</button>
        </div>
      </div>
    `;
  }).join("");

  // ── Build audit log ──
  const log = window.__gmLog || [];
  const logHTML = log.length === 0
    ? `<div class="gm-log-empty"><i class="fa-solid fa-clock-rotate-left"></i> No actions yet this session</div>`
    : log.map(e => `
        <div class="gm-log-entry log-${e.type}">
          <i class="${e.icon} gm-log-icon"></i>
          <span class="gm-log-text">${e.text}</span>
          <span class="gm-log-time">${e.time}</span>
        </div>
      `).join("");

  // ── Target avatar ──
  const avatarHTML = target
    ? `<div class="gm-target-avatar" style="${getAvatarStyle(target.nickname)}">${escapeHTML(target.nickname[0])}</div>`
    : "";

  // ── Assemble full panel ──
  container.innerHTML = `

    <!-- PLAYER LOOKUP — always visible -->
    ${cardHeader("lookup", "fa-solid fa-magnifying-glass", "Player Lookup")}
      <div class="gm-lookup-row">
        <input class="gm-input gm-lookup-input" id="gm-lookup-query"
               type="text" placeholder="Player ID or Nickname" autocomplete="off">
        <button class="btn-gm-lookup" id="btn-gm-lookup">
          <i class="fa-solid fa-search"></i> Search
        </button>
      </div>
      <div class="gm-message" id="gm-lookup-message"></div>

      ${target ? `
        <div class="gm-target-card">
          <div class="gm-target-row">
            ${avatarHTML}
            <div class="gm-target-info">
              <span class="gm-target-nickname">${escapeHTML(target.nickname)}</span>
              <span class="gm-target-id">ID: ${escapeHTML(target.playerId)}</span>
            </div>
            <div class="gm-target-badges">
              ${target.isVip ? `<span class="vip-badge vip-pulse"><i class="fa-solid fa-crown"></i> VIP</span>` : ""}
              <span class="gm-target-stat">Lv.${target.level}</span>
              <span class="gm-target-stat">${target.rebirths} ↺</span>
            </div>
          </div>
          <div class="gm-target-actions">
            <button class="btn-gm-target-lb ${target.lbHidden ? "gm-toggle-off" : "gm-toggle-on"}" id="btn-gm-target-lb-toggle">
              <i class="fa-solid fa-eye${target.lbHidden ? "-slash" : ""}"></i>
              ${target.lbHidden ? "Hidden on LB" : "Visible on LB"}
            </button>
            <button class="btn-gm-clear-target" id="btn-gm-clear-target">
              <i class="fa-solid fa-xmark"></i> Clear
            </button>
          </div>
        </div>
      ` : `
        <div class="gm-target-empty">
          <i class="fa-solid fa-user-slash"></i> No player selected — search above to unlock actions
        </div>
      `}
    ${cardClose()}

    ${target ? `
      <!-- SET VALUES -->
      ${cardHeader("setvalues", "fa-solid fa-sliders", "Set Values", `<span class="gm-card-for">→ ${escapeHTML(target.nickname)}</span>`)}
        <div class="gm-grid">${setValueRows}</div>
        <div class="gm-message" id="gm-message"></div>
      ${cardClose()}

      <!-- CRATES -->
      ${cardHeader("crates", "fa-solid fa-boxes-stacked", "Crates", `<span class="gm-card-for">→ ${escapeHTML(target.nickname)}</span>`)}
        ${crateRows}
        <div class="gm-message" id="gm-crate-message"></div>
      ${cardClose()}

      <!-- GM BUFFS -->
      ${cardHeader("buffs", "fa-solid fa-bolt", "GM Buffs", `<span class="gm-card-for">→ ${escapeHTML(target.nickname)}</span>`)}
        ${boosterRows}
        <div class="gm-message" id="gm-booster-message"></div>
      ${cardClose()}

      <!-- VIP MANAGEMENT -->
      ${cardHeader("vip", "fa-solid fa-crown", "VIP Management", `<span class="gm-card-for">→ ${escapeHTML(target.nickname)}</span>`)}
        <div class="gm-vip-section">
          <div class="gm-vip-actions">
            <input class="gm-input" id="gm-vip-days" type="number"
                   min="1" max="365" placeholder="Days" inputmode="numeric">
            <button class="btn-gm-vip btn-gm-grant"  id="btn-gm-grant-vip"><i class="fa-solid fa-crown"></i> Grant</button>
            <button class="btn-gm-vip btn-gm-revoke" id="btn-gm-revoke-vip"><i class="fa-solid fa-ban"></i> Revoke</button>
            <button class="btn-gm-vip btn-gm-check"  id="btn-gm-check-vip"><i class="fa-solid fa-magnifying-glass"></i> Check</button>
          </div>
          <div class="gm-message" id="gm-vip-message"></div>
        </div>
      ${cardClose()}
    ` : ""}

    <!-- AUDIT LOG — always visible -->
    ${cardHeader("log", "fa-solid fa-clock-rotate-left", "Action Log",
      log.length > 0 ? `<button class="gm-log-clear-btn" id="btn-gm-log-clear" style="margin-left:auto;text-transform:none;letter-spacing:0;font-size:10px">Clear</button>` : ""
    )}
      <div class="gm-log" id="gm-log-list">
        ${logHTML}
      </div>
    ${cardClose()}

  `;

  // Re-attach accordion toggle listeners after render
  container.querySelectorAll("[data-gm-toggle]").forEach(header => {
    header.addEventListener("click", e => {
      // Don't collapse if clicking inner buttons like log-clear
      if (e.target.closest(".gm-log-clear-btn")) return;
      const id   = header.dataset.gmToggle;
      const card = document.getElementById(`gm-card-${id}`);
      if (!card) return;
      window.__gmCollapsed[id] = !window.__gmCollapsed[id];
      card.classList.toggle("collapsed", window.__gmCollapsed[id]);
    });
  });
}

// ============================================================
// SECTION 4 — LEADERBOARD PANEL
// ============================================================

export function renderLeaderboardPanel(rows = [], category = "rebirths", loading = false) {
  renderLeaderboardTabs(category);
  renderLeaderboardTable(rows, category, loading);
}

function renderLeaderboardTabs(activeCategory) {
  const container = document.getElementById("leaderboard-tabs");
  if (!container) return;

  container.innerHTML = LEADERBOARD_CATEGORIES.map(cat => `
    <button class="lb-tab ${cat.key === activeCategory ? "active" : ""}"
            data-lb-category="${cat.key}"
            style="--lb-color: ${cat.color}">
      <i class="${cat.icon}"></i>
      <span>${cat.label}</span>
    </button>
  `).join("");
}

function renderLeaderboardTable(rows, category, loading) {
  const container = document.getElementById("leaderboard-table");
  if (!container) return;

  if (loading) {
    container.innerHTML = `<div class="lb-loading">Loading...</div>`;
    return;
  }
  if (!rows.length) {
    container.innerHTML = `<div class="lb-empty">No data yet. Be the first!</div>`;
    return;
  }

  const catDef   = LEADERBOARD_CATEGORIES.find(c => c.key === category);
  const valueKey = categoryToStateKey(category);

  container.innerHTML = `
    <div class="lb-header-row">
      <span class="lb-col-rank">Rank</span>
      <span class="lb-col-name">Player</span>
      <span class="lb-col-value">${catDef?.label || "Score"}</span>
    </div>
    ${rows.map(row => {
      const rowDim   = getDimension(row.dimension || "earth");
      const dimColor = rowDim?.theme?.accentColor || "#ffffff";
      const vipBadge = row.isVip
        ? `<span class="vip-badge vip-badge-lb vip-pulse"><i class="fa-solid fa-crown"></i> VIP</span>`
        : "";

      return `
        <div class="lb-row ${row.isCurrentPlayer ? "current-player" : ""}">
          <span class="lb-col-rank">${getRankBadge(row.rank)}</span>
          <span class="lb-col-name">
            ${vipBadge}
            <span class="lb-nickname" style="color: ${dimColor}">${escapeHTML(row.nickname)}</span>
          </span>
          <span class="lb-col-value">${catDef?.format(row[valueKey]) || row[valueKey]}</span>
        </div>
      `;
    }).join("")}
  `;
}
