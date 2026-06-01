// ============================================================
// UI-MINE.JS — Mine panel renderer + mining animations
// Covers: ore bar, mine stats, dimension selector,
//         booster badges, upgrade buttons, tick & sell animations
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMaxCapacity, computeMiningPower, computeOreValue } from "../economy.js";
import { ORE_TYPES } from "../data/mines-data.js";
import { getDimension, DIMENSIONS } from "../data/dimensions-data.js";
import { getBoosterStatus } from "../crates.js";
import { renderHUD } from "./ui-hud.js";
import {
  setText,
  setStyle,
  toggleClass,
  showToast,
  boosterIcon,
  boosterLabel,
  pickaxeCost,
  backpackCost,
} from "./ui-core.js";

// ============================================================
// SECTION 1 — MINE PANEL
// ============================================================

export function renderMinePanel() {
  renderOreBar();
  renderMineStats();
  renderDimensionSelector();
  renderBoosterBadges();
  renderUpgradeButtons();
}

function renderOreBar() {
  const current = state.ore;
  const max     = computeMaxCapacity();
  const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  setText("ore-current", formatNumber(current));
  setText("ore-max",     formatNumber(max));
  setStyle("ore-bar-fill", "width", percent + "%");

  const fill = document.getElementById("ore-bar-fill");
  if (fill) {
    fill.className = "ore-bar-fill";
    if (percent >= 100)      fill.classList.add("full");
    else if (percent >= 75)  fill.classList.add("high");
  }
}

function renderMineStats() {
  const oreId     = state.currentOreId || "dirt";
  const oreSample = ORE_TYPES[oreId] || {};

  const power     = computeMiningPower();
  const value     = computeOreValue(oreId);
  const dimension = getDimension(state.dimension);

  setText("stat-mining-power",    formatNumber(power) + "/s");
  setText("stat-ore-value",       "$" + formatNumber(value) + "/ore");
  setText("stat-ore-type",        oreSample.name  || "Dirt");
  setText("stat-dimension",       dimension?.name || "Earth");
  setText("stat-dimension-multi", dimension?.valueMulti + "x");
  setText("stat-pickaxe-level",   "Lv." + state.pickaxeLevel);
  setText("stat-backpack-level",  "Lv." + state.backpackLevel);
  setText("stat-blocks-mined",    formatNumber(state.blocksMined));
}

function renderDimensionSelector() {
  const container = document.getElementById("dimension-selector");
  if (!container) return;

  container.innerHTML = DIMENSIONS.map(dim => {
    const unlocked = state.dimensionUnlocked.includes(dim.id);
    const active   = state.dimension === dim.id;
    return `
      <button
        class="dim-btn ${active ? "active" : ""} ${unlocked ? "" : "locked"}"
        data-dim="${dim.id}"
        ${unlocked ? "" : "disabled"}
        title="${unlocked ? dim.description : "Unlock at " + dim.unlockAt + " rebirths"}"
      >
        <i class="${dim.icon}" style="font-size:13px;opacity:0.85;flex-shrink:0"></i>
        <span class="dim-name">${dim.name}</span>
        <span class="dim-multi">${dim.valueMulti}x</span>
        ${unlocked ? "" : `<span class="dim-lock"><i class="fa-solid fa-lock"></i> ${dim.unlockAt}↺</span>`}
      </button>
    `;
  }).join("");
}

export function renderBoosterBadges() {
  const container = document.getElementById("booster-badges");
  if (!container) return;

  const status      = getBoosterStatus();
  const isActiveVip = state.isVip && Date.now() < state.vipExpiresAt;

  const vipBadge = isActiveVip ? `
    <div class="booster-badge booster-vip">
      <i class="fa-solid fa-crown"></i>
      <span class="booster-text">VIP 2× Sell</span>
    </div>
  ` : "";

  const badges = Object.entries(status)
    .filter(([, b]) => b.active)
    .map(([key, b]) => `
      <div class="booster-badge booster-${key}">
        <i class="${boosterIcon(key)}"></i>
        <span class="booster-text">${b.multiplier}x ${boosterLabel(key)}</span>
        <span class="booster-timer">${b.formatted}</span>
      </div>
    `).join("");

  container.innerHTML = (vipBadge + badges) || `<span class="no-boosters">No active boosters</span>`;
}

function renderUpgradeButtons() {
  const { cash } = state;

  const pCost   = pickaxeCost(state.pickaxeLevel);
  const pAfford = cash >= pCost;
  setText("btn-pickaxe-cost",  "$" + formatNumber(pCost));
  setText("btn-pickaxe-level", "Lv." + state.pickaxeLevel);
  toggleClass("btn-upgrade-pickaxe", "can-afford", pAfford);

  const bCost   = backpackCost(state.backpackLevel);
  const bAfford = cash >= bCost;
  setText("btn-backpack-cost",  "$" + formatNumber(bCost));
  setText("btn-backpack-level", "Lv." + state.backpackLevel);
  toggleClass("btn-upgrade-backpack", "can-afford", bAfford);

  const fillPct = state.ore / computeMaxCapacity();
  toggleClass("btn-sell", "pulse", fillPct >= 0.9);
  setText("btn-sell-amount", formatNumber(state.ore) + " ore");
}

// ============================================================
// SECTION 2 — MINING ANIMATIONS
// ============================================================

export function animateMiningTick(oreMined, oreType) {
  const current = state.ore;
  const max     = computeMaxCapacity();
  const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  setStyle("ore-bar-fill", "width", percent + "%");
  setText("ore-current", formatNumber(current));
  setText("btn-sell-amount", formatNumber(current) + " ore");

  const fillPct = current / max;
  toggleClass("btn-sell", "pulse", fillPct >= 0.9);

  const { cash } = state;
  toggleClass("btn-upgrade-pickaxe",  "can-afford", cash >= pickaxeCost(state.pickaxeLevel));
  toggleClass("btn-upgrade-backpack", "can-afford", cash >= backpackCost(state.backpackLevel));

  if (oreMined > 0) spawnFloatingText("+" + formatNumber(oreMined), "ore-float");
}

export function animateSell(cashEarned) {
  renderHUD();
  const cashEl = document.getElementById("hud-cash");
  if (cashEl) {
    cashEl.classList.remove("cash-flash");
    void cashEl.offsetWidth;
    cashEl.classList.add("cash-flash");
  }
  spawnFloatingText("+" + formatNumber(cashEarned), "sell-float");
  showToast(`Sold for $${formatNumber(cashEarned)}!`, "success", 2000);
}

function spawnFloatingText(text, className) {
  const minePanel = document.getElementById("panel-mine");
  if (!minePanel) return;
  const el = document.createElement("div");
  el.className   = `floating-text ${className}`;
  el.textContent = text;
  minePanel.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
