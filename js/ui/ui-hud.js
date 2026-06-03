// ============================================================
// UI-HUD.JS — Top HUD bar renderer
// Renders nickname, VIP badge, cash, shards, level, XP bar,
// rebirths, and dimension label.
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMiningPower, computeOreValue } from "../economy.js";
import { getDimension } from "../data/dimensions-data.js";
import { getMineTier, rollOre } from "../data/mines-data.js";
import { setText, setStyle, xpForLevel, openVipModal } from "./ui-core.js";
import { isGameMasterSync } from "../gm.js";

export function renderHUD() {
  const isActiveVip = state.isVip && Date.now() < state.vipExpiresAt;
  const dimension   = getDimension(state.dimension);
  const dimColor    = dimension?.theme?.accentColor || "#ffffff";

  // ── Nickname button — preserve the stats icon, only update text node ──
  const nicknameEl = document.getElementById("hud-nickname");
  if (nicknameEl) {
    // Update only the first text node so the icon stays intact
    const textNode = [...nicknameEl.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = state.nickname + " ";
    } else {
      nicknameEl.textContent = state.nickname + " ";
    }
    nicknameEl.style.color = dimColor;

    // Wire click once
    if (!nicknameEl._statsWired) {
      nicknameEl.addEventListener("click", openStatsModal);
      nicknameEl._statsWired = true;
    }
  }

  // VIP badge next to nickname — always shown, clickable
  const existingBadge = document.getElementById("hud-vip-badge");
  if (existingBadge) existingBadge.remove();

  if (nicknameEl) {
    const badge = document.createElement("span");
    badge.id        = "hud-vip-badge";
    badge.style.cursor = "pointer";

    if (isActiveVip) {
      badge.className = "vip-badge vip-badge-hud vip-pulse";
      badge.innerHTML = `<i class="fa-solid fa-crown"></i> VIP`;
    } else {
      badge.className = "vip-badge vip-badge-hud vip-badge-hud--inactive";
      badge.innerHTML = `<i class="fa-solid fa-crown"></i> VIP`;
      badge.style.background  = "var(--bg-card)";
      badge.style.color       = "var(--text-muted)";
      badge.style.border      = "1px solid var(--border)";
      badge.style.boxShadow   = "none";
    }

    if (!badge._vipWired) {
      badge.addEventListener("click", openVipModal);
      badge._vipWired = true;
    }

    nicknameEl.insertAdjacentElement("afterend", badge);
  }

  setText("hud-cash",      "$" + formatNumber(state.cash));
  setText("hud-shards",    state.shards.toLocaleString() + " ✦");
  setText("hud-level",     "Lv." + state.level);
  setText("hud-rebirths",  state.rebirths + " ↺");
  setText("hud-dimension", dimension?.name || "Earth");

  // ── Passive income rate — "+$X/s" shown under Cash ──
  const rateEl = document.getElementById("hud-income-rate");
  if (rateEl) {
    const power    = computeMiningPower();
    const mineTier = getMineTier(state.level);
    const ore      = rollOre(mineTier);
    const oreValue = computeOreValue(ore.id);
    // Average ore per second * value per block = cash/sec estimate
    const cashPerSec = Math.floor((power / 2) * oreValue);
    rateEl.textContent = cashPerSec > 0 ? "+$" + formatNumber(cashPerSec) + "/s" : "";
  }

  // ── XP bar + label ──
  const xpFloor   = xpForLevel(state.level);
  const xpCeil    = xpForLevel(state.level + 1);
  const xpInLevel = state.xp - xpFloor;
  const xpNeeded  = xpCeil - xpFloor;
  const xpPercent = Math.min((xpInLevel / xpNeeded) * 100, 100);
  setStyle("hud-xp-fill", "width", xpPercent + "%");

  // XP label: "Lv.4 → Lv.5 · 72%"
  const xpLabel = document.getElementById("hud-xp-label");
  if (xpLabel) {
    xpLabel.textContent = `Lv.${state.level} → Lv.${state.level + 1} · ${Math.floor(xpPercent)}%`;
  }

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
