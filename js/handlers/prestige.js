// ============================================================
// HANDLERS/PRESTIGE.JS — Prestige & Rebirth event handlers
// ============================================================

import { doRebirth, canRebirth } from "../economy.js";
import { triggerPrestige } from "../prestige.js";
import { showToast, showModal } from "../ui/ui-core.js";
import { renderHUD } from "../ui/ui-hud.js";
import { renderMinePanel } from "../ui/ui-mine.js";
import { renderPrestigePanel } from "../ui/ui-prestige.js";
import { submitLeaderboardScore } from "../leaderboard.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function bindPrestigeEvents() {
  on("btn-rebirth",  "click", handleRebirth);
  on("btn-prestige", "click", handlePrestige);
}

function handleRebirth() {
  if (!canRebirth()) {
    showToast("Not ready to rebirth yet.", "error", 2000);
    return;
  }
  showModal({
    title:       "Rebirth?",
    message:     "This resets your cash, ore, level, and gear — but keeps pets, crates, and shards. You'll earn +10% sell value permanently.",
    confirmText: "Rebirth",
    cancelText:  "Cancel",
    onConfirm:   () => {
      const result = doRebirth();
      if (result.success) {
        showToast(result.message, "success", 4000);
        submitLeaderboardScore().catch(() => {});
        renderHUD();
        renderMinePanel();
        renderPrestigePanel();
      }
    },
  });
}

function handlePrestige() {
  showModal({
    title:       "Prestige?",
    message:     "This resets EVERYTHING including rebirths. You'll receive 1 Prestige Token to spend in the shop.",
    confirmText: "Prestige",
    cancelText:  "Cancel",
    onConfirm:   () => {
      const result = triggerPrestige();
      if (result.success) {
        showToast(result.message, "success", 4000);
        submitLeaderboardScore().catch(() => {});
        renderHUD();
        renderMinePanel();
        renderPrestigePanel();
      } else {
        showToast(result.message, "error", 2000);
      }
    },
  });
}
