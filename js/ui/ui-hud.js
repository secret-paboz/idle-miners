// ============================================================
// UI-HUD.JS — Top HUD bar renderer
// Renders nickname, VIP badge, cash, shards, level, XP bar,
// rebirths, and dimension label.
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMiningPower } from "../economy.js";
import { getDimension } from "../data/dimensions-data.js";
import { setText, setStyle, xpForLevel } from "./ui-core.js";
import { isGameMasterSync } from "../gm.js";

export function renderHUD() {
  const isActiveVip = state.isVip && Date.now() < state.vipExpiresAt;
  const dimension   = getDimension(state.dimension);
  const dimColor    = dimension?.theme?.accentColor || "#ffffff";

  const nicknameEl = document.getElementById("hud-nickname");
  if (nicknameEl) {
    nicknameEl.textContent = state.nickname;
    nicknameEl.style.color = dimColor;

    // Wire click once
    if (!nicknameEl._statsWired) {
      nicknameEl.addEventListener("click", openStatsModal);
      nicknameEl._statsWired = true;
    }
  }

  // VIP badge next to nickname
  const existingBadge = document.getElementById("hud-vip-badge");
  if (existingBadge) existingBadge.remove();

  if (isActiveVip && nicknameEl) {
    const badge = document.createElement("span");
    badge.id        = "hud-vip-badge";
    badge.className = "vip-badge vip-badge-hud vip-pulse";
    badge.innerHTML = `<i class="fa-solid fa-crown"></i> VIP`;
    nicknameEl.insertAdjacentElement("afterend", badge);
  }

  setText("hud-cash",      "$" + formatNumber(state.cash));
  setText("hud-shards",    state.shards.toLocaleString() + " ✦");
  setText("hud-level",     "Lv." + state.level);
  setText("hud-rebirths",  state.rebirths + " ↺");
  setText("hud-dimension", dimension?.name || "Earth");

  // XP bar
  const xpFloor   = xpForLevel(state.level);
  const xpCeil    = xpForLevel(state.level + 1);
  const xpInLevel = state.xp - xpFloor;
  const xpNeeded  = xpCeil - xpFloor;
  const xpPercent = Math.min((xpInLevel / xpNeeded) * 100, 100);
  setStyle("hud-xp-fill", "width", xpPercent + "%");

  // Tint XP bar with dimension accent colour
  const xpFill = document.getElementById("hud-xp-fill");
  if (xpFill) xpFill.style.background = dimColor;

  const guestBadge = document.getElementById("hud-guest-badge");
  if (guestBadge) guestBadge.style.display = state.isGuest ? "inline-flex" : "none";

  // Show GM tab button only for game masters
  const gmTab = document.getElementById("tab-gm");
  if (gmTab) gmTab.style.display = isGameMasterSync() ? "flex" : "none";
}

function openStatsModal() {
  renderStatsModal();
  const overlay = document.getElementById("stats-modal-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    // Wire close button once
    const closeBtn = document.getElementById("btn-stats-modal-close");
    if (closeBtn && !closeBtn._wired) {
      closeBtn.addEventListener("click", closeStatsModal);
      closeBtn._wired = true;
    }
    // Close on overlay backdrop click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeStatsModal();
    }, { once: true });
  }
}

function closeStatsModal() {
  const overlay = document.getElementById("stats-modal-overlay");
  if (overlay) overlay.style.display = "none";
}

function renderStatsModal() {
  const power     = computeMiningPower();
  const dimension = getDimension(state.dimension);

  setText("stat-mining-power",    "1–" + formatNumber(power) + "/s");
  setText("stat-dimension",       dimension?.name || "Earth");
  setText("stat-dimension-multi", (dimension?.miningMultiplier ?? 1) + "x");
  setText("stat-blocks-mined",    formatNumber(state.blocksMined ?? 0));
  setText("stat-pickaxe-level",   "Lv." + (state.pickaxeLevel ?? 1));
  setText("stat-backpack-level",  "Lv." + (state.backpackLevel ?? 1));
  setText("stat-cash-earned",     "$" + formatNumber(state.cashEarned ?? 0));
  setText("stat-rebirths",        state.rebirths ?? 0);
}
