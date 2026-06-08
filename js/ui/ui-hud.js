// ============================================================
// UI-HUD.JS — Top HUD bar renderer
// Two-row layout:
//   Row 1: Cash + rate | Nickname (center) + VIP badge | Level + Dimension
//   Row 2: Shards | Inline XP bar (Lv.X ── % ── Lv.Y) | Rebirths
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMiningPower, computeOreValue } from "../economy.js";
import { getDimension } from "../data/dimensions-data.js";
import { ORE_TYPES } from "../data/mines-data.js";
import { setText, xpForLevel, openVipModal } from "./ui-core.js";

export function renderHUD() {
  const isActiveVip = state.isVip && Date.now() < state.vipExpiresAt;
  const dimension   = getDimension(state.dimension);
  const dimColor    = dimension?.theme?.accentColor || "#f5a623";

  // ── ROW 1: Nickname (centered identity block) ──────────────
  const nicknameEl = document.getElementById("hud-nickname");
  if (nicknameEl) {
    const textNode = [...nicknameEl.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = state.nickname + " ";
    } else {
      nicknameEl.textContent = state.nickname + " ";
    }
    nicknameEl.style.color = dimColor;

    if (!nicknameEl._statsWired) {
      nicknameEl.addEventListener("click", openStatsModal);
      nicknameEl._statsWired = true;
    }
  }

  // VIP badge — remove and re-insert each render to stay in sync
  const existingBadge = document.getElementById("hud-vip-badge");
  if (existingBadge) existingBadge.remove();

  const identityEl = document.querySelector(".hud-identity");
  if (identityEl) {
    const badge = document.createElement("span");
    badge.id           = "hud-vip-badge";
    badge.style.cursor = "pointer";
    badge.style.flexShrink = "0";

    if (isActiveVip) {
      badge.className = "vip-badge vip-badge-hud vip-pulse";
      badge.innerHTML = `<i class="fa-solid fa-crown"></i> VIP`;
    } else {
      badge.className = "vip-badge vip-badge-hud";
      badge.style.background = "var(--bg-card)";
      badge.style.color      = "var(--text-muted)";
      badge.style.border     = "1px solid var(--border)";
      badge.style.boxShadow  = "none";
      badge.innerHTML        = `<i class="fa-solid fa-crown"></i> VIP`;
    }

    badge.addEventListener("click", openVipModal);
    identityEl.appendChild(badge);
  }

  // ── ROW 1: Cash + rate ─────────────────────────────────────
  const cashEl2 = document.getElementById("hud-cash");
  if (cashEl2) {
    cashEl2.textContent = "$" + formatNumber(state.cash);

    // Subtle green tint at high income rates — thresholds are loose
    const power2      = computeMiningPower();
    const oreValue2   = computeOreValue(state.currentOreId || "dirt");
    const rate2       = power2 * oreValue2;
    if      (rate2 >= 100000) cashEl2.style.color = "#81c784"; // strong green
    else if (rate2 >= 10000)  cashEl2.style.color = "#a5d6a7"; // light green
    else if (rate2 >= 1000)   cashEl2.style.color = "#c8e6c9"; // very light
    else                      cashEl2.style.color = "";         // default
  }

  const rateEl = document.getElementById("hud-income-rate");
  if (rateEl) {
    const power      = computeMiningPower();
    const oreId      = state.currentOreId || "dirt";
    const oreValue   = computeOreValue(oreId);
    const cashPerSec = Math.floor(power * oreValue);
    const rateText   = cashPerSec > 0 ? "+$" + formatNumber(cashPerSec) + "/s" : "";

    // Pulse only when value changes
    if (rateEl.textContent !== rateText && rateText) {
      rateEl.classList.remove("rate-pulse");
      void rateEl.offsetWidth;
      rateEl.classList.add("rate-pulse");
    }

    rateEl.textContent = rateText;

    // PC tooltip — exact unformatted value
    if (cashPerSec > 0) {
      rateEl.title = `$${cashPerSec.toLocaleString()} per second`;
    } else {
      rateEl.title = "";
    }
  }

  // ── ROW 1: Level + Dimension ───────────────────────────────
  setText("hud-level",     "Lv." + state.level);
  setText("hud-dimension", dimension?.name || "Earth");

  // ── ROW 2: Shards ──────────────────────────────────────────
  setText("hud-shards", formatNumber(state.shards) + " ✦");

  // ── ROW 2: Inline XP bar ───────────────────────────────────
  const xpFloor   = xpForLevel(state.level);
  const xpCeil    = xpForLevel(state.level + 1);
  const xpInLevel = state.xp - xpFloor;
  const xpNeeded  = xpCeil - xpFloor;
  const xpPercent = Math.min((xpInLevel / xpNeeded) * 100, 100);

  const xpFill = document.getElementById("hud-xp-fill");
  if (xpFill) {
    xpFill.style.width      = xpPercent + "%";
    xpFill.style.background = dimColor;
  }

  const xpLabel = document.getElementById("hud-xp-label");
  if (xpLabel) xpLabel.textContent = Math.floor(xpPercent) + "%";

  const xpFrom = document.getElementById("hud-xp-from");
  const xpTo   = document.getElementById("hud-xp-to");
  if (xpFrom) xpFrom.textContent = "Lv." + state.level;
  if (xpTo)   xpTo.textContent   = "Lv." + (state.level + 1);

  // ── ROW 2: Rebirths ────────────────────────────────────────
  setText("hud-rebirths", state.rebirths + " ↺");

  // ── Guest badge ────────────────────────────────────────────
  const guestBadge = document.getElementById("hud-guest-badge");
  if (guestBadge) guestBadge.style.display = state.isGuest ? "inline-flex" : "none";

}

// ============================================================
// STATS MODAL
// ============================================================

function openStatsModal() {
  renderStatsModal();
  const overlay = document.getElementById("stats-modal-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";

  const closeBtn = document.getElementById("btn-stats-modal-close");
  if (closeBtn && !closeBtn._wired) {
    closeBtn.addEventListener("click", closeStatsModal);
    closeBtn._wired = true;
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeStatsModal();
  }, { once: true });
}

function closeStatsModal() {
  const overlay = document.getElementById("stats-modal-overlay");
  if (overlay) overlay.style.display = "none";
}

function renderStatsModal() {
  const power     = computeMiningPower();
  const dimension = getDimension(state.dimension);

  // Player ID — show "Guest" for guest players
  const playerIdEl = document.getElementById("stat-player-id");
  if (playerIdEl) {
    playerIdEl.textContent = state.isGuest
      ? "Guest (not saved)"
      : (state.playerId || "—");
  }

  setText("stat-mining-power",    "1–" + formatNumber(power) + "/s");
  setText("stat-dimension",       dimension?.name || "Earth");
  setText("stat-dimension-multi", (dimension?.valueMulti ?? 1) + "x");
  setText("stat-blocks-mined",    formatNumber(state.blocksMined ?? 0));
  setText("stat-pickaxe-level",   "Lv." + (state.pickaxeLevel ?? 1));
  setText("stat-backpack-level",  "Lv." + (state.backpackLevel ?? 1));
  setText("stat-cash-earned",     "$" + formatNumber(state.cashEarned ?? 0));
  setText("stat-rebirths",        state.rebirths ?? 0);
}
