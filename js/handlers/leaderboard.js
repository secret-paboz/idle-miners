// ============================================================
// HANDLERS/LEADERBOARD.JS — Leaderboard modal event handlers
//
// CHANGED:
// - Removed btn-leaderboard-float reference (replaced by FAB menu)
// - Removed handleLeaderboardTabClick (tabs now wired inside
//   loadAndRenderLeaderboard via renderLbTabs in ui-core.js)
// - openLeaderboardModal() in ui-core.js is the single entry
//   point for opening; this file only handles closing
// ============================================================

import { loadAndRenderLeaderboard } from "../ui/ui-core.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function bindLeaderboardEvents() {
  // Close button inside the modal
  on("btn-leaderboard-close", "click", handleCloseLeaderboard);

  // Tap outside the modal box to close
  const overlay = document.getElementById("leaderboard-modal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) handleCloseLeaderboard();
    });
  }
}

function handleCloseLeaderboard() {
  const modal = document.getElementById("leaderboard-modal");
  if (modal) modal.style.display = "none";
}
