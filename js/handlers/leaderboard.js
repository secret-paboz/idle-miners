// ============================================================
// HANDLERS/LEADERBOARD.JS — Leaderboard modal event handlers
// ============================================================

import { loadAndRenderLeaderboard } from "../ui/ui-core.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

let currentLbCategory = "rebirths";

export function bindLeaderboardEvents() {
  on("btn-leaderboard-float", "click", handleOpenLeaderboard);
  on("btn-leaderboard-close", "click", handleCloseLeaderboard);

  const overlay = document.getElementById("leaderboard-modal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) handleCloseLeaderboard();
    });
  }

  on("leaderboard-tabs", "click", handleLeaderboardTabClick);
}

function handleOpenLeaderboard() {
  const modal = document.getElementById("leaderboard-modal");
  if (modal) modal.style.display = "flex";
  loadAndRenderLeaderboard(currentLbCategory);
}

function handleCloseLeaderboard() {
  const modal = document.getElementById("leaderboard-modal");
  if (modal) modal.style.display = "none";
}

async function handleLeaderboardTabClick(e) {
  const btn = e.target.closest("[data-lb-category]");
  if (!btn) return;
  currentLbCategory = btn.dataset.lbCategory;
  await loadAndRenderLeaderboard(currentLbCategory);
}
