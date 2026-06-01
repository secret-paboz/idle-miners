// ============================================================
// UI-PRESTIGE.JS — Prestige panel renderer
// Covers: rebirth progress section, prestige progress section,
//         and the prestige shop upgrade cards
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

  setText("rebirth-pickaxe-progress", `Pickaxe: ${progress.pickaxe.current} / 200`);
  setStyle("rebirth-pickaxe-bar", "width", progress.pickaxe.percent + "%");
  toggleClass("rebirth-pickaxe-bar", "done", progress.pickaxe.done);

  setText("rebirth-backpack-progress", `Backpack: ${progress.backpack.current} / 200`);
  setStyle("rebirth-backpack-bar", "width", progress.backpack.percent + "%");
  toggleClass("rebirth-backpack-bar", "done", progress.backpack.done);

  setText("rebirth-count", "Rebirths: " + state.rebirths);
  setText("rebirth-bonus", "+" + (state.rebirths * 10) + "% sell value");

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

  setText("prestige-rebirths-progress", `Rebirths: ${progress.rebirths.current} / 25`);
  setStyle("prestige-rebirths-bar", "width", progress.rebirths.percent + "%");

  setText("prestige-pickaxe-progress", `Pickaxe: ${progress.pickaxe.current} / 200`);
  setStyle("prestige-pickaxe-bar", "width", progress.pickaxe.percent + "%");

  setText("prestige-backpack-progress", `Backpack: ${progress.backpack.current} / 200`);
  setStyle("prestige-backpack-bar", "width", progress.backpack.percent + "%");

  setText("prestige-tokens", state.prestigeTokens + " tokens");
  setText("prestige-count",  "Prestiges: " + state.prestiges);

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
  container.innerHTML = status.upgrades.map(upgrade => `
    <div class="prestige-card ${upgrade.maxed ? "maxed" : ""} ${upgrade.canAfford ? "can-afford" : ""}"
         style="--prestige-color: ${upgrade.color}; --prestige-glow: ${upgrade.glowColor}">
      <div class="prestige-card-header">
        <i class="${upgrade.icon}" style="color:${upgrade.color}"></i>
        <span class="prestige-name">${upgrade.name}</span>
        <span class="prestige-level">Lv.${upgrade.currentLevel} / ${upgrade.maxLevel}</span>
      </div>
      <div class="prestige-desc">${upgrade.description}</div>
      <div class="prestige-effect">
        <span class="effect-current">${upgrade.currentEffect}</span>
        ${upgrade.nextEffect ? `<span class="effect-next">→ ${upgrade.nextEffect}</span>` : ""}
      </div>
      <button class="btn-buy-prestige ${upgrade.maxed ? "maxed" : ""} ${upgrade.canAfford ? "" : "disabled"}"
              data-prestige-upgrade="${upgrade.key}"
              ${upgrade.maxed || !upgrade.canAfford ? "disabled" : ""}>
        ${upgrade.maxed ? "MAXED" : `Buy (${upgrade.cost} token${upgrade.cost !== 1 ? "s" : ""})`}
      </button>
    </div>
  `).join("");
}
