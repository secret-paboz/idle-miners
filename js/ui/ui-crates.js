// ============================================================
// UI-CRATES.JS — Crates panel renderer + crate open animation
// Covers: timed crate SVG ring countdowns, crate inventory
//         with loot preview pills, and reward reveal card
// ============================================================

import { state } from "../state.js";
import { getCrateInventory, CRATE_TYPES } from "../crates.js";
import { COOLDOWNS } from "../data/pets-data.js";
import { renderBoosterBadges } from "./ui-mine.js";
import { setText, toggleClass, showToast, formatCooldown } from "./ui-core.js";

// SVG ring circumference for r=18 circle
const RING_CIRC = 2 * Math.PI * 18; // ≈ 113.1

// Loot type → icon + label
const LOOT_ICONS = {
  miningSpeed: { icon: "fa-solid fa-bolt",        label: "Speed"  },
  sellValue:   { icon: "fa-solid fa-coins",        label: "Sell"   },
  xpGain:      { icon: "fa-solid fa-star",         label: "XP"     },
};

// ============================================================
// SECTION 1 — RENDER PANEL
// ============================================================

export function renderCratesPanel() {
  renderCrateTimers();
  renderCrateInventory();
}

// ============================================================
// SECTION 2 — TIMED CRATE COUNTDOWN RINGS
// ============================================================

const TIMER_CONFIG = [
  { stateKey: "lastHourlyTime", ringId: "ring-hourly", valId: "val-timer-hourly", btnId: "btn-claim-hourly", slotId: "timer-hourly", cooldown: COOLDOWNS.hourly },
  { stateKey: "lastDailyTime",  ringId: "ring-daily",  valId: "val-timer-daily",  btnId: "btn-claim-daily",  slotId: "timer-daily",  cooldown: COOLDOWNS.daily  },
  { stateKey: "lastWeeklyTime", ringId: "ring-weekly", valId: "val-timer-weekly", btnId: "btn-claim-weekly", slotId: "timer-weekly", cooldown: COOLDOWNS.weekly },
];

export function renderCrateTimers() {
  const now = Date.now();

  TIMER_CONFIG.forEach(({ stateKey, ringId, valId, btnId, slotId, cooldown }) => {
    const last      = state[stateKey] || 0;
    const elapsed   = now - last;
    const ready     = elapsed >= cooldown;
    const remaining = ready ? 0 : Math.ceil((cooldown - elapsed) / 1000);
    const progress  = ready ? 1 : elapsed / cooldown;

    // Slot class
    const slot = document.getElementById(slotId);
    if (slot) {
      slot.classList.toggle("ready",   ready);
      slot.classList.toggle("waiting", !ready);
    }

    // Ring fill
    const ring = document.getElementById(ringId);
    if (ring) {
      ring.style.strokeDashoffset = RING_CIRC * (1 - Math.min(progress, 1));
    }

    // Timer value text
    const valEl = document.getElementById(valId);
    if (valEl) valEl.textContent = ready ? "Ready!" : formatCooldown(remaining);

    // Claim button
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = !ready;
      btn.classList.toggle("disabled", !ready);
      btn.textContent = ready ? "Claim" : "Waiting";
    }
  });
}

// ============================================================
// SECTION 3 — CRATE INVENTORY WITH LOOT PREVIEW
// ============================================================

function buildLootPreview(crateData) {
  // Deduplicate booster keys from loot table
  const seen = new Set();
  return crateData.lootTable
    .filter(entry => {
      if (seen.has(entry.boosterKey)) return false;
      seen.add(entry.boosterKey);
      return true;
    })
    .map(entry => {
      const info = LOOT_ICONS[entry.boosterKey] || { icon: "fa-solid fa-box", label: entry.boosterKey };
      return `<span class="crate-loot-pill"><i class="${info.icon}"></i> ${info.label}</span>`;
    })
    .join("");
}

function renderCrateInventory() {
  const container = document.getElementById("crate-inventory");
  if (!container) return;

  const inventory = getCrateInventory();
  const hasAny    = inventory.some(c => c.count > 0);

  if (!hasAny) {
    container.innerHTML = `<div class="crate-inventory-empty"><i class="fa-solid fa-box-open"></i> No crates in inventory</div>`;
    return;
  }

  container.innerHTML = inventory.map(crate => {
    const hasCrates   = crate.count > 0;
    const lootPreview = buildLootPreview(crate);

    return `
      <div class="crate-card ${hasCrates ? "has-crates" : "no-crates"}"
           style="--crate-color:${crate.color};--crate-glow:${crate.glowColor}">

        <div class="crate-icon"><i class="${crate.icon}"></i></div>

        <div class="crate-info">
          <div class="crate-name">${crate.name}</div>
          <div class="crate-loot-preview">${lootPreview}</div>
        </div>

        <div class="crate-count-wrap">
          <div class="crate-count">${crate.count}</div>
          <div class="crate-count-label">owned</div>
        </div>

        <div class="crate-actions">
          <button class="btn-open-crate ${!hasCrates ? "disabled" : ""}"
                  data-crate="${crate.id}" ${!hasCrates ? "disabled" : ""}>
            Open
          </button>
          <button class="btn-open-all-crate ${crate.count < 2 ? "disabled" : ""}"
                  data-crate-all="${crate.id}" ${crate.count < 2 ? "disabled" : ""}>
            All (${crate.count})
          </button>
        </div>

      </div>
    `;
  }).join("");
}

// ============================================================
// SECTION 4 — CRATE OPEN ANIMATION
// ============================================================

export function animateCrateOpen(result) {
  if (!result.success) { showToast(result.message, "error"); return; }

  const loot = result.result;
  showCrateReward(result.crateData, loot);
  showToast(`🎁 ${loot.label}! ${loot.description}`, "success", 4000);
  renderCratesPanel();
  renderBoosterBadges();
}

function showCrateReward(crateData, loot) {
  const existing = document.getElementById("crate-reward-card");
  if (existing) existing.remove();

  const container = document.getElementById("crate-inventory");
  if (!container) return;

  const info = LOOT_ICONS[loot.boosterKey] || { icon: "fa-solid fa-box" };

  const card     = document.createElement("div");
  card.id        = "crate-reward-card";
  card.className = "crate-reward-card";
  card.style.setProperty("--reward-color", crateData?.color || "#ffc107");
  card.innerHTML = `
    <div class="crate-reward-inner">
      <div class="crate-reward-icon-wrap">
        <i class="${info.icon}"></i>
      </div>
      <div class="crate-reward-text">
        <div class="crate-reward-title">${loot.label}!</div>
        <div class="crate-reward-desc">${loot.description}</div>
      </div>
      <button class="crate-reward-close" id="btn-reward-close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `;

  container.parentNode.insertBefore(card, container);

  document.getElementById("btn-reward-close").onclick = () => {
    card.classList.add("hiding");
    setTimeout(() => card.remove(), 300);
  };

  setTimeout(() => {
    if (document.getElementById("crate-reward-card")) {
      card.classList.add("hiding");
      setTimeout(() => card.remove(), 300);
    }
  }, 5000);
}
