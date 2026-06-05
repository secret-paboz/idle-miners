// ============================================================
// HANDLERS/MINE.JS — Mine panel event handlers
// ============================================================

import { sellOre, upgradePickaxe, upgradeBackpack } from "../economy.js";
import { showToast } from "../ui/ui-core.js";
import { renderMinePanel, animateSell } from "../ui/ui-mine.js";
import { renderHUD } from "../ui/ui-hud.js";
import { submitLeaderboardScore } from "../leaderboard.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function bindMineEvents() {
  on("btn-sell",             "click", handleSell);
  on("btn-upgrade-pickaxe",  "click", handleUpgradePickaxe);
  on("btn-upgrade-backpack", "click", handleUpgradeBackpack);
}

function handleSell() {
  const result = sellOre();
  if (result.cashEarned > 0) {
    animateSell(result.cashEarned);
    // Submit leaderboard score on sell so cash_earned stays current
    submitLeaderboardScore().catch(() => {});
  } else {
    showToast("Nothing to sell!", "error", 1500);
  }
}

function handleUpgradePickaxe() {
  const result = upgradePickaxe();
  if (result.success) {
    showToast(result.message, "success", 2000);
    renderMinePanel();
    renderHUD();
  } else {
    showToast(result.message, "error", 2000);
  }
}

function handleUpgradeBackpack() {
  const result = upgradeBackpack();
  if (result.success) {
    showToast(result.message, "success", 2000);
    renderMinePanel();
    renderHUD();
  } else {
    showToast(result.message, "error", 2000);
  }
}
