// ============================================================
// UI-HUD.JS — Top HUD bar renderer
// Renders nickname, VIP badge, cash, shards, level, XP bar,
// rebirths, and dimension label.
// ============================================================

import { state } from "../state.js";
import { formatNumber } from "../economy.js";
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
