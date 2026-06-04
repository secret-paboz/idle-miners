// ============================================================
// UI-MINE.JS — Mine panel renderer + mining animations
// Covers: ore bar, mine stats, dimension selector,
//         booster badges, upgrade buttons, tick & sell animations
//
// CHANGED (UX pass):
// - renderDimensionSelector() — lock label now reads "X Rebirths"
//   instead of "X↺" for mobile clarity
// - renderBoosterBadges() — empty state now shows a hint pointing
//   to the Crates panel instead of bare "No active boosters"
// - renderUpgradeButtons() — adds next-level preview text
//   (+X ore/s for pickaxe, +X cap for backpack)
// - animateMiningTick() — log entries now include ore sprite
// - appendMiningLog() — ore type parameter passed through so
//   the sprite path can be resolved
// ============================================================

import { state } from "../state.js";
import {
  formatNumber,
  computeMaxCapacity,
  computeMiningPower,
  pickaxeNextLevelGain,
  backpackNextLevelGain,
} from "../economy.js";
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

  // Pulse sell button based on fill level
  toggleClass("btn-sell", "sell-warning", percent >= 80 && percent < 100);
  toggleClass("btn-sell", "urgent",       percent >= 100);
}

function renderMineStats() {
  const dimension = getDimension(state.dimension);
  const power     = computeMiningPower();

  setText("stat-mining-power",    "1–" + formatNumber(power) + "/s");
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

    // Use readable label instead of symbol-only "5↺" — mobile has no hover tooltips
    const lockLabel = `<div class="dim-card-lock">
      <i class="fa-solid fa-lock"></i> ${dim.unlockAt} Rebirths
    </div>`;

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
          : lockLabel
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
      const msLeft = b.endsAt - Date.now();
      const urgent = msLeft > 0 && msLeft < 5 * 60 * 1000;
      return `
        <div class="booster-badge booster-${key} ${urgent ? "expiring-soon" : ""}">
          <i class="${boosterIcon(key)}"></i>
          <span class="booster-text">${b.multiplier}x ${boosterLabel(key)}</span>
          <span class="booster-timer ${urgent ? "urgent" : ""}">${b.formatted}</span>
        </div>
      `;
    }).join("");

  const hasContent = vipBadge || badges;

  // Empty state: hint to open Crates instead of a dead-end message
  container.innerHTML = hasContent || `
    <div>
      <span class="no-boosters"><i class="fa-solid fa-circle-info"></i> No active boosters</span>
      <div class="no-boosters-hint">
        <i class="fa-solid fa-gift"></i> Open crates to earn boosters
      </div>
    </div>
  `;
}

function renderUpgradeButtons() {
  const { cash } = state;

  // ── Pickaxe ──
  const pCost   = pickaxeCost(state.pickaxeLevel);
  const pAfford = cash >= pCost;
  setText("btn-pickaxe-cost",    "$" + formatNumber(pCost));
  setText("btn-pickaxe-level",   "Lv." + state.pickaxeLevel);
  setText("btn-pickaxe-preview", "+" + formatNumber(pickaxeNextLevelGain()) + " ore/s");
  toggleClass("btn-upgrade-pickaxe", "can-afford",    pAfford);
  toggleClass("btn-upgrade-pickaxe", "cannot-afford", !pAfford);

  // ── Backpack ──
  const bCost   = backpackCost(state.backpackLevel);
  const bAfford = cash >= bCost;
  setText("btn-backpack-cost",    "$" + formatNumber(bCost));
  setText("btn-backpack-level",   "Lv." + state.backpackLevel);
  setText("btn-backpack-preview", "+" + formatNumber(backpackNextLevelGain()) + " cap");
  toggleClass("btn-upgrade-backpack", "can-afford",    bAfford);
  toggleClass("btn-upgrade-backpack", "cannot-afford", !bAfford);

  // ── Sell button state ──
  const fillPct = state.ore / computeMaxCapacity();
  toggleClass("btn-sell", "sell-warning", fillPct >= 0.8 && fillPct < 1.0);
  toggleClass("btn-sell", "urgent",       fillPct >= 1.0);
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
  toggleClass("btn-sell", "sell-warning", fillPct >= 0.8 && fillPct < 1.0);
  toggleClass("btn-sell", "urgent",       fillPct >= 1.0);

  const { cash } = state;
  toggleClass("btn-upgrade-pickaxe",  "can-afford",    cash >= pickaxeCost(state.pickaxeLevel));
  toggleClass("btn-upgrade-pickaxe",  "cannot-afford", cash <  pickaxeCost(state.pickaxeLevel));
  toggleClass("btn-upgrade-backpack", "can-afford",    cash >= backpackCost(state.backpackLevel));
  toggleClass("btn-upgrade-backpack", "cannot-afford", cash <  backpackCost(state.backpackLevel));

  if (oreMined > 0) {
    const oreId   = state.currentOreId || "dirt";
    const oreName = ORE_TYPES[oreId]?.name || "Ore";
    appendMiningLog("+" + formatNumber(oreMined) + " " + oreName, "ore", oreId);
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
  appendMiningLog("$" + formatNumber(cashEarned) + " sold", "sell", null);
  showToast(`Sold for $${formatNumber(cashEarned)}!`, "success", 2000);
}

const MAX_LOG_ENTRIES = 40;

function _relativeTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// oreId: string like "coal" | "diamond" | null (for sell entries)
function appendMiningLog(text, type, oreId) {
  const feed = document.getElementById("mining-log-feed");
  if (!feed) return;

  // Remove empty placeholder on first entry
  const empty = feed.querySelector(".mining-log-empty");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = `mining-log-entry mining-log-${type}`;

  const now  = Date.now();
  const time = _relativeTime(now);
  // Store timestamp on entry for live updates (future use)

  // Ore sprite for mining entries; coin icon for sell entries
  let spriteHtml = "";
  if (type === "ore" && oreId) {
    spriteHtml = `<img class="mining-log-sprite" src="/sprites/${oreId}.png" alt="${oreId}" draggable="false">`;
  } else if (type === "sell") {
    spriteHtml = `<i class="fa-solid fa-coins" style="font-size:12px;color:var(--color-success);flex-shrink:0"></i>`;
  }

  entry.innerHTML = `
    <span class="mining-log-time">${time}</span>
    ${spriteHtml}
    <span class="mining-log-text">${text}</span>
  `;

  feed.prepend(entry);

  // Cap entries
  const entries = feed.querySelectorAll(".mining-log-entry");
  if (entries.length > MAX_LOG_ENTRIES) {
    entries[entries.length - 1].remove();
  }
}
