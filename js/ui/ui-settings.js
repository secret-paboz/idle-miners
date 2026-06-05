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
  const container = document.getElementById("gm-panel-content");
  if (!isGameMasterSync() || !container) return;

  const hidden  = isGMHiddenFromLeaderboard();
  const target  = window.__gmTarget || null; // { id, playerId, nickname, isVip, level, rebirths, dimension, gameData }

  const boosterRows = [
    { key: "miningSpeed", label: "Mining Speed", icon: "fa-solid fa-bolt",  color: "#42a5f5" },
    { key: "sellValue",   label: "Sell Value",   icon: "fa-solid fa-coins", color: "#ffc107" },
    { key: "xpGain",      label: "XP Gain",      icon: "fa-solid fa-star",  color: "#ab47bc" },
  ].map(({ key, label, icon, color }) => {
    // Show active status from target's game_data if available, else local state
    const src      = target ? (target.gameData?.boosters?.[key] || {}) : (window.__stateRef?.boosters?.[key] || {});
    const isActive = src.endsAt > Date.now();
    const minsLeft = isActive ? Math.ceil((src.endsAt - Date.now()) / 60000) : 0;
    return `
      <div class="gm-booster-row">
        <div class="gm-booster-label">
          <i class="${icon}" style="color:${color}"></i> ${label}
          <span class="gm-booster-status ${isActive ? "active" : "inactive"}">
            ${isActive ? `${src.multiplier}x &middot; ${minsLeft}m left` : "Off"}
          </span>
        </div>
        <div class="gm-booster-inputs">
          <input class="gm-input" id="gm-booster-mult-${key}"  type="number" min="1" max="100" placeholder="&times;" title="Multiplier">
          <input class="gm-input" id="gm-booster-mins-${key}"  type="number" min="1" max="1440" placeholder="min" title="Minutes">
          <button class="btn-gm-apply" data-gm-booster="${key}" title="Apply booster">Set</button>
          <button class="btn-gm-clear" data-gm-booster-clear="${key}" title="Clear booster">&times;</button>
        </div>
      </div>
    `;
  }).join("");

  const crateOptions = [
    { id: "common",    label: "Common",    icon: "fa-solid fa-box-open", color: "#9e9e9e" },
    { id: "rare",      label: "Rare",      icon: "fa-solid fa-gem",      color: "#26c6da" },
    { id: "legendary", label: "Legendary", icon: "fa-solid fa-trophy",   color: "#ffc107" },
    { id: "hourly",    label: "Hourly",    icon: "fa-solid fa-box",      color: "#78909c" },
    { id: "daily",     label: "Daily",     icon: "fa-solid fa-gift",     color: "#42a5f5" },
    { id: "weekly",    label: "Weekly",    icon: "fa-solid fa-crown",    color: "#ab47bc" },
  ];

  const targetCrates = target?.gameData?.crates || {};

  const crateRows = crateOptions.map(({ id, label, icon, color }) => {
    const count = target ? (targetCrates[id] || 0) : 0;
    return `
      <div class="gm-crate-row">
        <div class="gm-crate-label">
          <i class="${icon}" style="color:${color}"></i>
          <span>${label}</span>
          <span class="gm-crate-count">${count}</span>
        </div>
        <div class="gm-crate-inputs">
          <input class="gm-input" id="gm-crate-amt-${id}" type="number" min="1" max="999" placeholder="amt">
          <button class="btn-gm-add"    data-gm-crate-add="${id}">+Add</button>
          <button class="btn-gm-remove" data-gm-crate-remove="${id}">-Remove</button>
        </div>
      </div>
    `;
  }).join("");

  const setValueRows = [
    ["Cash",             "cash",       target?.gameData?.cash],
    ["Shards",           "shards",     target?.gameData?.shards],
    ["Ore",              "ore",        target?.gameData?.ore],
    ["Player Level",     "level",      target?.gameData?.level],
    ["XP",               "xp",         target?.gameData?.xp],
    ["Pickaxe Level",    "pickaxe",    target?.gameData?.pickaxeLevel],
    ["Backpack Level",   "backpack",   target?.gameData?.backpackLevel],
    ["Rebirths",         "rebirths",   target?.gameData?.rebirths],
    ["Prestige Tokens",  "ptokens",    target?.gameData?.prestigeTokens],
    ["Total Cash Earned","cashearned", target?.gameData?.cashEarned],
  ].map(([label, action, current]) => `
    <div class="gm-row">
      <label class="gm-row-label">${label}</label>
      <div class="gm-row-controls">
        <span class="gm-row-current">${current !== undefined ? current : "—"}</span>
        <input class="gm-input" id="gm-input-${action}" type="number" min="0" placeholder="new value">
        <button class="btn-gm-set" data-gm-action="${action}">Set</button>
      </div>
    </div>
  `).join("");

  container.innerHTML = `

    <!-- ── LEADERBOARD ── -->
    <div class="gm-card">
      <div class="gm-card-header"><i class="fa-solid fa-trophy"></i> Leaderboard</div>
      <div class="gm-card-body">
        <button class="btn-gm-toggle ${hidden ? "gm-toggle-off" : "gm-toggle-on"}" id="btn-gm-lb-toggle">
          <i class="fa-solid fa-eye${hidden ? "-slash" : ""}"></i>
          ${hidden ? "Hidden from leaderboard" : "Visible on leaderboard"}
        </button>
      </div>
    </div>

    <!-- ── PLAYER LOOKUP ── -->
    <div class="gm-card">
      <div class="gm-card-header"><i class="fa-solid fa-magnifying-glass"></i> Player Lookup</div>
      <div class="gm-card-body">
        <div class="gm-lookup-row">
          <input class="gm-input gm-lookup-input" id="gm-lookup-query"
                 type="text" placeholder="Player ID or Nickname" autocomplete="off">
          <button class="btn-gm-lookup" id="btn-gm-lookup">
            <i class="fa-solid fa-search"></i> Look Up
          </button>
        </div>
        <div class="gm-message" id="gm-lookup-message"></div>

        ${target ? `
          <div class="gm-target-card">
            <div class="gm-target-row">
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
            <button class="btn-gm-clear-target" id="btn-gm-clear-target">
              <i class="fa-solid fa-xmark"></i> Clear target
            </button>
          </div>
        ` : `
          <div class="gm-target-empty">
            <i class="fa-solid fa-user-slash"></i> No player selected — look up a player to unlock actions below
          </div>
        `}
      </div>
    </div>

    <!-- ── SET VALUES (hidden until target selected) ── -->
    ${target ? `
    <div class="gm-card">
      <div class="gm-card-header">
        <i class="fa-solid fa-sliders"></i> Set Values
        <span class="gm-card-for">&rarr; ${escapeHTML(target.nickname)}</span>
      </div>
      <div class="gm-card-body">
        <div class="gm-grid">${setValueRows}</div>
        <div class="gm-message" id="gm-message"></div>
      </div>
    </div>
    ` : ""}

    <!-- ── CRATES (hidden until target selected) ── -->
    ${target ? `
    <div class="gm-card">
      <div class="gm-card-header">
        <i class="fa-solid fa-boxes-stacked"></i> Crates
        <span class="gm-card-for">&rarr; ${escapeHTML(target.nickname)}</span>
      </div>
      <div class="gm-card-body">
        ${crateRows}
        <div class="gm-message" id="gm-crate-message"></div>
      </div>
    </div>
    ` : ""}

    <!-- ── GM BUFFS / BOOSTERS (hidden until target selected) ── -->
    ${target ? `
    <div class="gm-card">
      <div class="gm-card-header">
        <i class="fa-solid fa-bolt"></i> GM Buffs
        <span class="gm-card-for">&rarr; ${escapeHTML(target.nickname)}</span>
      </div>
      <div class="gm-card-body">
        ${boosterRows}
        <div class="gm-message" id="gm-booster-message"></div>
      </div>
    </div>
    ` : ""}

    <!-- ── VIP MANAGEMENT (hidden until target selected) ── -->
    ${target ? `
    <div class="gm-card">
      <div class="gm-card-header">
        <i class="fa-solid fa-crown" style="color:#ffc107"></i> VIP Management
        <span class="gm-card-for">&rarr; ${escapeHTML(target.nickname)}</span>
      </div>
      <div class="gm-card-body">
        <div class="gm-vip-row">
          <input class="gm-input gm-vip-input" id="gm-vip-playerid" type="text"
                 placeholder="Player ID" autocomplete="off"
                 value="${escapeHTML(target.playerId)}">
          <input class="gm-input gm-vip-days" id="gm-vip-days" type="number"
                 min="1" max="365" placeholder="Days">
        </div>
        <div class="gm-vip-actions">
          <button class="btn-gm-vip btn-gm-grant"  id="btn-gm-grant-vip"><i class="fa-solid fa-crown"></i> Grant</button>
          <button class="btn-gm-vip btn-gm-revoke" id="btn-gm-revoke-vip"><i class="fa-solid fa-ban"></i> Revoke</button>
          <button class="btn-gm-vip btn-gm-check"  id="btn-gm-check-vip"><i class="fa-solid fa-magnifying-glass"></i> Check</button>
        </div>
        <div class="gm-message" id="gm-vip-message"></div>
      </div>
    </div>
    ` : ""}

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
