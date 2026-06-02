// ============================================================
// UI-CRATES.JS — Crates panel renderer + crate open animation
// Covers: crate inventory cards, timed crate countdown timers,
//         and the animateCrateOpen feedback function
// ============================================================

import { state } from "../state.js";
import { getCrateInventory } from "../crates.js";
import { renderBoosterBadges } from "./ui-mine.js";
import { setText, toggleClass, showToast, formatCooldown } from "./ui-core.js";

// ============================================================
// SECTION 1 — CRATES PANEL
// ============================================================

export function renderCratesPanel() {
  renderCrateInventory();
  renderCrateTimers();
}

// ============================================================
// SECTION 2 — CRATE INVENTORY
// ============================================================

function renderCrateInventory() {
  const container = document.getElementById("crate-inventory");
  if (!container) return;

  const inventory = getCrateInventory();
  container.innerHTML = inventory.map(crate => `
    <div class="crate-card" style="--crate-color: ${crate.color}; --crate-glow: ${crate.glowColor}">
      <div class="crate-icon"><i class="${crate.icon}"></i></div>
      <div class="crate-info">
        <div class="crate-name">${crate.name}</div>
        <div class="crate-desc">${crate.description}</div>
      </div>
      <div class="crate-count">${crate.count}</div>
      <div class="crate-actions">
        <button class="btn-open-crate ${crate.count < 1 ? "disabled" : ""}"
                data-crate="${crate.id}" ${crate.count < 1 ? "disabled" : ""}>
          Open
        </button>
        <button class="btn-open-all-crate ${crate.count < 2 ? "disabled" : ""}"
                data-crate-all="${crate.id}" ${crate.count < 2 ? "disabled" : ""}>
          Open All (${crate.count})
        </button>
      </div>
    </div>
  `).join("");
}

// ============================================================
// SECTION 3 — TIMED CRATE COUNTDOWNS
// ============================================================

export function renderCrateTimers() {
  const now    = Date.now();
  const timers = [
    { key: "lastHourlyTime", id: "timer-hourly", label: "Hourly Crate", interval: 60 * 60 * 1000          },
    { key: "lastDailyTime",  id: "timer-daily",  label: "Daily Crate",  interval: 24 * 60 * 60 * 1000     },
    { key: "lastWeeklyTime", id: "timer-weekly", label: "Weekly Crate", interval: 7 * 24 * 60 * 60 * 1000 },
  ];

  timers.forEach(({ key, id, label, interval, crateId }) => {
    const last      = state[key] || 0;
    const elapsed   = now - last;
    const ready     = elapsed >= interval;
    const remaining = ready ? 0 : Math.ceil((interval - elapsed) / 1000);

    const el = document.getElementById(id);
    if (!el) return;

    el.innerHTML = `
      <div class="crate-timer ${ready ? "ready" : "waiting"}">
        <span class="timer-label">${label}</span>
        <span class="timer-value">${ready ? "Ready!" : formatCooldown(remaining)}</span>
        <button class="btn-claim-crate ${ready ? "" : "disabled"}"
                data-claim="${crateId}" ${ready ? "" : "disabled"}>
          ${ready ? "Claim" : "Waiting"}
        </button>
      </div>
    `;
  });
}

// ============================================================
// SECTION 4 — CRATE OPEN ANIMATION
// ============================================================

export function animateCrateOpen(result) {
  if (!result.success) { showToast(result.message, "error"); return; }
  const loot = result.result;
  showToast(`${result.crateData.name}: ${loot.label}! ${loot.description}`, "success", 4000);
  renderCratesPanel();
  renderBoosterBadges();
}
