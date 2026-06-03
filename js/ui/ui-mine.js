// ============================================================
// UI-MINE.JS — Mine panel renderer + mining animations
// Covers: ore bar, mine stats, dimension selector,
//         booster badges, upgrade buttons, tick & sell animations
//
// CHANGED:
// - renderMineStats() — removed computeOreValue import and
//   the setText("stat-ore-value") line (stat removed from HTML)
// - renderOreBar() — added warning (70%) and danger (90%) bar states
// - renderUpgradeButtons() — added cannot-afford class for gray-out
// - animateMiningTick() — syncs bar color states every tick
// - renderBoosterBadges() — adds expiring-soon pulse when < 5min left
// ============================================================

import { state } from "../state.js";
import { formatNumber, computeMaxCapacity, computeMiningPower } from "../economy.js";
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
    if      (percent >= 100) fill.classList.add("full");
    else if (percent >= 90)  fill.classList.add("danger");
    else if (percent >= 70)  fill.classList.add("warning");
  }

  // Pulse sell button when backpack is nearly full
  toggleClass("btn-sell", "pulse",  percent >= 90);
  toggleClass("btn-sell", "urgent", percent >= 100);
}

function renderMineStats() {
  const dimension = getDimension(state.dimension);
  const power     = computeMiningPower();

  setText("stat-mining-power",    formatNumber(power) + "/s");
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
    const color    = dim.theme?.accentColor || "#f5a623";
    return `
      <button
        class="dim-card ${active ? "active" : ""} ${unlocked ? "" : "locked"}"
        data-dim="${dim.id}"
        ${unlocked ? "" : "disabled"}
        style="--dim-color: ${color}"
        title="${unlocked ? dim.description : "Unlock at " + dim.unlockAt + " rebirths"}"
      >
        <div class="dim-card-icon"><i class="${dim.icon}"></i></div>
        <div class="dim-card-name">${dim.name}</div>
        ${unlocked
          ? `<div class="dim-card-multi">${dim.valueMulti}x</div>`
          : `<div class="dim-card-lock"><i class="fa-solid fa-lock"></i> ${dim.unlockAt}↺</div>`
        }
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
    .map(([key, b]) => {
      // Warn when under 5 minutes remaining
      const msLeft  = b.endsAt - Date.now();
      const urgent  = msLeft > 0 && msLeft < 5 * 60 * 1000;
      return `
        <div class="booster-badge booster-${key} ${urgent ? "expiring-soon" : ""}">
          <i class="${boosterIcon(key)}"></i>
          <span class="booster-text">${b.multiplier}x ${boosterLabel(key)}</span>
          <span class="booster-timer ${urgent ? "urgent" : ""}">${b.formatted}</span>
        </div>
      `;
    }).join("");

  container.innerHTML = (vipBadge + badges) || `<span class="no-boosters">No active boosters</span>`;
}

function renderUpgradeButtons() {
  const { cash } = state;

  const pCost   = pickaxeCost(state.pickaxeLevel);
  const pAfford = cash >= pCost;
  setText("btn-pickaxe-cost",  "$" + formatNumber(pCost));
  setText("btn-pickaxe-level", "Lv." + state.pickaxeLevel);
  toggleClass("btn-upgrade-pickaxe", "can-afford",    pAfford);
  toggleClass("btn-upgrade-pickaxe", "cannot-afford", !pAfford);

  const bCost   = backpackCost(state.backpackLevel);
  const bAfford = cash >= bCost;
  setText("btn-backpack-cost",  "$" + formatNumber(bCost));
  setText("btn-backpack-level", "Lv." + state.backpackLevel);
  toggleClass("btn-upgrade-backpack", "can-afford",    bAfford);
  toggleClass("btn-upgrade-backpack", "cannot-afford", !bAfford);

  const fillPct = state.ore / computeMaxCapacity();
  toggleClass("btn-sell", "pulse",  fillPct >= 0.9);
  toggleClass("btn-sell", "urgent", fillPct >= 1.0);
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

  // Sync bar color states every tick
  const fill = document.getElementById("ore-bar-fill");
  if (fill) {
    fill.className = "ore-bar-fill";
    if      (percent >= 100) fill.classList.add("full");
    else if (percent >= 90)  fill.classList.add("danger");
    else if (percent >= 70)  fill.classList.add("warning");
  }

  const fillPct = current / max;
  toggleClass("btn-sell", "pulse",  fillPct >= 0.9);
  toggleClass("btn-sell", "urgent", fillPct >= 1.0);

  const { cash } = state;
  toggleClass("btn-upgrade-pickaxe",  "can-afford",    cash >= pickaxeCost(state.pickaxeLevel));
  toggleClass("btn-upgrade-pickaxe",  "cannot-afford", cash <  pickaxeCost(state.pickaxeLevel));
  toggleClass("btn-upgrade-backpack", "can-afford",    cash >= backpackCost(state.backpackLevel));
  toggleClass("btn-upgrade-backpack", "cannot-afford", cash <  backpackCost(state.backpackLevel));

  if (oreMined > 0) {
    const oreId   = state.currentOreId || "dirt";
    const oreName = ORE_TYPES[oreId]?.name || "Ore";
    spawnFloatingText("+" + formatNumber(oreMined), oreName, oreId, "ore-float");
  }
}

export function animateSell(cashEarned) {
  renderHUD();
  const cashEl = document.getElementById("hud-cash");
  if (cashEl) {
    cashEl.classList.remove("cash-flash");
    void cashEl.offsetWidth;
    cashEl.classList.add("cash-flash");
  }
  spawnFloatingText("+" + formatNumber(cashEarned), "", "", "sell-float");
  showToast(`Sold for $${formatNumber(cashEarned)}!`, "success", 2000);
}

function spawnFloatingText(amount, oreName, oreId, className) {
  const minePanel = document.getElementById("panel-mine");
  if (!minePanel) return;

  const el = document.createElement("div");
  el.className = `floating-text ${className}`;

  if (oreId) {
    el.innerHTML = `
      <img src="/sprites/${oreId}.png" class="float-sprite" alt="${oreName}">
      <span>${amount} ${oreName}</span>
    `;
  } else {
    el.textContent = amount;
  }

  minePanel.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
