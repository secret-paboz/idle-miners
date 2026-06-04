// ============================================================
// UI-PRESTIGE.JS — Prestige panel renderer
// Covers: rebirth progress, prestige progress, prestige shop
// ============================================================

import { state } from "../state.js";
import { getPrestigeStatus, getPrestigeProgress, getRebirthProgress } from "../prestige.js";
import { setText, setStyle, toggleClass } from "./ui-core.js";

// ============================================================
// SECTION 1 — PRESTIGE PANEL
// ============================================================

export function renderPrestigePanel() {
  renderRebirthSection();
  renderPrestigeSection();
  renderPrestigeShop();
}

// ============================================================
// SECTION 2 — REBIRTH PROGRESS
// ============================================================

function renderRebirthSection() {
  const progress = getRebirthProgress();

  // Count + bonus (just numbers — labels are in HTML)
  setText("rebirth-count", state.rebirths);
  setText("rebirth-bonus", "+" + (state.rebirths * 10) + "% sell");

  // Pickaxe bar
  setText("rebirth-pickaxe-progress", progress.pickaxe.current + " / 200");
  setStyle("rebirth-pickaxe-bar", "width", progress.pickaxe.percent + "%");
  toggleClass("rebirth-pickaxe-bar", "done", progress.pickaxe.done);

  // Backpack bar
  setText("rebirth-backpack-progress", progress.backpack.current + " / 200");
  setStyle("rebirth-backpack-bar", "width", progress.backpack.percent + "%");
  toggleClass("rebirth-backpack-bar", "done", progress.backpack.done);

  // Button
  const btn = document.getElementById("btn-rebirth");
  if (btn) {
    btn.disabled = !progress.canRebirth;
    btn.classList.toggle("eligible", progress.canRebirth);
  }
}

// ============================================================
// SECTION 3 — PRESTIGE PROGRESS
// ============================================================

function renderPrestigeSection() {
  const progress = getPrestigeProgress();
  const status   = getPrestigeStatus();

  // Count + tokens (just numbers — labels are in HTML)
  setText("prestige-count",  state.prestiges);
  setText("prestige-tokens", state.prestigeTokens);

  // Token hint in shop title
  setText("prestige-shop-tokens",
    state.prestigeTokens > 0
      ? "✦ " + state.prestigeTokens + " token" + (state.prestigeTokens !== 1 ? "s" : "")
      : ""
  );

  // Rebirths bar
  setText("prestige-rebirths-progress", progress.rebirths.current + " / 25");
  setStyle("prestige-rebirths-bar", "width", progress.rebirths.percent + "%");
  toggleClass("prestige-rebirths-bar", "done", progress.rebirths.done);

  // Pickaxe bar
  setText("prestige-pickaxe-progress", progress.pickaxe.current + " / 200");
  setStyle("prestige-pickaxe-bar", "width", progress.pickaxe.percent + "%");
  toggleClass("prestige-pickaxe-bar", "done", progress.pickaxe.done);

  // Backpack bar
  setText("prestige-backpack-progress", progress.backpack.current + " / 200");
  setStyle("prestige-backpack-bar", "width", progress.backpack.percent + "%");
  toggleClass("prestige-backpack-bar", "done", progress.backpack.done);

  // Button
  const btn = document.getElementById("btn-prestige");
  if (btn) {
    btn.disabled = !status.eligible;
    btn.classList.toggle("eligible", status.eligible);
  }
}

// ============================================================
// SECTION 4 — PRESTIGE SHOP
// ============================================================

function renderPrestigeShop() {
  const container = document.getElementById("prestige-shop");
  if (!container) return;

  const status = getPrestigeStatus();

  container.innerHTML = status.upgrades.map(upgrade => {
    const levelPct = Math.round((upgrade.currentLevel / upgrade.maxLevel) * 100);

    return `
      <div class="prestige-card
                  ${upgrade.maxed    ? "maxed"     : ""}
                  ${upgrade.canAfford ? "can-afford" : ""}"
           style="--prestige-color:${upgrade.color};--prestige-glow:${upgrade.glowColor}">

        <div class="prestige-card-header">
          <i class="${upgrade.icon}" style="color:${upgrade.color}"></i>
          <span class="prestige-name">${upgrade.name}</span>
          <span class="prestige-level">Lv.${upgrade.currentLevel} / ${upgrade.maxLevel}</span>
        </div>

        <!-- Level progress bar -->
        <div class="prestige-level-bar">
          <div class="prestige-level-fill" style="width:${levelPct}%"></div>
        </div>

        <div class="prestige-desc">${upgrade.description}</div>

        <div class="prestige-effect">
          <span class="effect-current">${upgrade.currentEffect}</span>
          ${upgrade.nextEffect
            ? `<span class="effect-arrow">→</span>
               <span class="effect-next">${upgrade.nextEffect}</span>`
            : ""}
        </div>

        <button class="btn-buy-prestige
                        ${upgrade.maxed     ? "maxed"    : ""}
                        ${upgrade.canAfford ? ""         : "disabled"}"
                data-prestige-upgrade="${upgrade.key}"
                ${upgrade.maxed || !upgrade.canAfford ? "disabled" : ""}>
          ${upgrade.maxed
            ? `<i class="fa-solid fa-check"></i> Maxed`
            : `<i class="fa-solid fa-medal"></i> ${upgrade.cost} token${upgrade.cost !== 1 ? "s" : ""}`}
        </button>

      </div>
    `;
  }).join("");
}
