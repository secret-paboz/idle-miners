// ============================================================
// UI-SETTINGS.JS — Settings panel, leaderboard, register modal,
//                  and GM panel renderers
// ============================================================

import { state } from "../state.js";
import { getAuthStatus } from "../auth.js";
import { LEADERBOARD_CATEGORIES, getRankBadge } from "../leaderboard.js";
import { isGameMasterSync, isGMHiddenFromLeaderboard } from "../gm.js";
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

  const now          = Date.now();
  const isActiveVip  = auth.isVip && state.vipExpiresAt > now;
  const vipExpiryStr = isActiveVip
    ? new Date(state.vipExpiresAt).toLocaleDateString()
    : null;

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

        ${isActiveVip ? `
          <div class="vip-status-card active">
            <div class="vip-card-pulse"></div>
            <div class="vip-status-header">
              <span class="vip-badge vip-pulse"><i class="fa-solid fa-crown"></i> VIP</span>
              <span class="vip-status-title">Active</span>
              <span class="vip-expiry">· Expires ${vipExpiryStr}</span>
            </div>
            <ul class="vip-perks-list">
              <li><i class="fa-solid fa-check"></i> 2× Sell Value</li>
              <li><i class="fa-solid fa-check"></i> Auto-Sell when full</li>
              <li><i class="fa-solid fa-check"></i> 12h offline mining</li>
            </ul>
          </div>
        ` : ``}
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
            <a href="#" id="btn-show-register">Register here!</a>
          </div>
        </div>
      </div>
    `;
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
// SECTION 3 — GM PANEL
// ============================================================

export function renderGMPanel() {
  const floatBtn = document.getElementById("btn-gm-float");
  const container = document.getElementById("gm-panel-content");

  if (!isGameMasterSync()) {
    if (floatBtn) floatBtn.style.display = "none";
    return;
  }

  // Show the floating GM button
  if (floatBtn) floatBtn.style.display = "flex";

  if (!container) return;

  const hidden = isGMHiddenFromLeaderboard();

  container.innerHTML = `
    <div class="gm-section-label">Leaderboard</div>
    <button class="btn-gm-toggle ${hidden ? "gm-toggle-off" : "gm-toggle-on"}" id="btn-gm-lb-toggle">
      ${hidden ? "Hidden from leaderboard" : "Visible on leaderboard"}
    </button>

    <div class="gm-section-label">Set Values</div>
    <div class="gm-grid">
      ${[
        ["Cash",              "cash",       state.cash],
        ["Shards",            "shards",     state.shards],
        ["Ore",               "ore",        state.ore],
        ["Player Level",      "level",      state.level],
        ["XP",                "xp",         state.xp],
        ["Pickaxe Level",     "pickaxe",    state.pickaxeLevel],
        ["Backpack Level",    "backpack",   state.backpackLevel],
        ["Rebirths",          "rebirths",   state.rebirths],
        ["Prestige Tokens",   "ptokens",    state.prestigeTokens],
        ["Total Cash Earned", "cashearned", state.cashEarned],
      ].map(([label, action, current]) => `
        <div class="gm-row">
          <label>${label}</label>
          <input class="gm-input" id="gm-input-${action}" type="number" min="0" placeholder="${current}">
          <button class="btn-gm-set" data-gm-action="${action}">Set</button>
        </div>
      `).join("")}
    </div>
    <div class="gm-message" id="gm-message"></div>

    <div class="gm-section-label">👑 VIP Management</div>
    <div class="gm-vip-section">
      <div class="gm-vip-row">
        <input class="gm-input gm-vip-input" id="gm-vip-playerid" type="text"
               placeholder="Player ID (e.g. Piererra)" autocomplete="off">
        <input class="gm-input gm-vip-days"  id="gm-vip-days"     type="number"
               min="1" max="365" placeholder="Days">
      </div>
      <div class="gm-vip-actions">
        <button class="btn-gm-vip btn-gm-grant"  id="btn-gm-grant-vip">
          <i class="fa-solid fa-crown"></i> Grant VIP
        </button>
        <button class="btn-gm-vip btn-gm-revoke" id="btn-gm-revoke-vip">
          <i class="fa-solid fa-ban"></i> Revoke VIP
        </button>
        <button class="btn-gm-vip btn-gm-check"  id="btn-gm-check-vip">
          <i class="fa-solid fa-magnifying-glass"></i> Check
        </button>
      </div>
      <div class="gm-message" id="gm-vip-message"></div>
    </div>
  `;
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
