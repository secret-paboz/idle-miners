// ============================================================
// UI-PETS.JS — Pets panel renderer
// Covers: hunt/fish cooldown buttons with SVG ring timers,
//         pet grid with owned/unowned states, upgrade rows
// ============================================================

import { state } from "../state.js";
import { formatNumber } from "../economy.js";
import { PETS_DATA, RARITY_CONFIG, COOLDOWNS } from "../data/pets-data.js";
import {
  setText,
  toggleClass,
  formatCooldown,
  shardCost,
} from "./ui-core.js";

// SVG ring circumference for r=18 circle
const RING_CIRC = 2 * Math.PI * 18; // ≈ 113.1

// ============================================================
// SECTION 1 — PETS PANEL
// ============================================================

export function renderPetsPanel() {
  renderPetCooldowns();
  renderPetGrid();
}

// ============================================================
// SECTION 2 — HUNT / FISH COOLDOWNS
// ============================================================

export function renderPetCooldowns() {
  const now = Date.now();

  const huntElapsed   = now - (state.lastHuntTime || 0);
  const fishElapsed   = now - (state.lastFishTime || 0);
  const huntReady     = huntElapsed >= COOLDOWNS.hunt;
  const fishReady     = fishElapsed >= COOLDOWNS.fish;
  const huntRemaining = huntReady ? 0 : Math.ceil((COOLDOWNS.hunt - huntElapsed) / 1000);
  const fishRemaining = fishReady ? 0 : Math.ceil((COOLDOWNS.fish - fishElapsed) / 1000);

  // Timer text
  setText("btn-hunt-timer", huntReady ? "Ready!" : formatCooldown(huntRemaining));
  setText("btn-fish-timer", fishReady ? "Ready!" : formatCooldown(fishRemaining));

  // Button state classes
  toggleClass("btn-hunt", "ready",       huntReady);
  toggleClass("btn-hunt", "on-cooldown", !huntReady);
  toggleClass("btn-fish", "ready",       fishReady);
  toggleClass("btn-fish", "on-cooldown", !fishReady);

  // SVG ring — stroke-dashoffset represents progress remaining
  // offset = CIRC means empty (full cooldown), 0 means full (ready)
  _updateRing("hunt-ring-fill", huntReady ? 1 : huntElapsed / COOLDOWNS.hunt);
  _updateRing("fish-ring-fill", fishReady ? 1 : fishElapsed / COOLDOWNS.fish);
}

function _updateRing(id, progress) {
  const el = document.getElementById(id);
  if (!el) return;
  // progress 0→1: 0 = just started (full ring shown), 1 = done (ring hidden by CSS)
  const offset = RING_CIRC * (1 - Math.min(progress, 1));
  el.style.strokeDashoffset = offset;
}

// ============================================================
// SECTION 3 — PET GRID
// ============================================================

// Returns current effect label for owned pets
function getPetEffectLabel(pet, level) {
  const pct = (pet.modifier * level * 100).toFixed(0);
  switch (pet.rarity) {
    case "common":    return `+${pct}% backpack capacity`;
    case "uncommon":  return `+${pct}% mining speed`;
    case "rare":      return `+${pct}% sell value`;
    case "legendary": {
      const effectName = pet.legendaryEffect === "mining" ? "mining speed" : "sell value";
      return `+${pct}% ${effectName}`;
    }
    default: return pet.description;
  }
}

// Returns next-level effect label for upgrade preview
function getNextEffectLabel(pet, level) {
  const nextLevel = level + 1;
  const pct       = (pet.modifier * nextLevel * 100).toFixed(0);
  switch (pet.rarity) {
    case "common":    return `→ +${pct}% backpack`;
    case "uncommon":  return `→ +${pct}% speed`;
    case "rare":      return `→ +${pct}% sell`;
    case "legendary": {
      const effectName = pet.legendaryEffect === "mining" ? "speed" : "sell";
      return `→ +${pct}% ${effectName}`;
    }
    default: return "";
  }
}

// How to obtain hint based on rarity
function getObtainHint(rarity) {
  switch (rarity) {
    case "common":
    case "uncommon":  return `<i class="fa-solid fa-khanda"></i> Hunt`;
    case "rare":      return `<i class="fa-solid fa-fish"></i> Fish`;
    case "legendary": return `<i class="fa-solid fa-fish"></i> Fish (rare)`;
    default:          return "Unknown";
  }
}

function renderPetGrid() {
  const container = document.getElementById("pet-grid");
  if (!container) return;

  const owned   = [];
  const unowned = [];

  Object.entries(PETS_DATA).forEach(([petId, pet]) => {
    const petState = state.pets[petId];
    if (petState?.owned) owned.push({ petId, pet, petState });
    else unowned.push({ petId, pet, petState: petState || { owned: false, level: 0 } });
  });

  container.innerHTML = [...owned, ...unowned].map(({ petId, pet, petState }) => {
    const rarity    = RARITY_CONFIG[pet.rarity];
    const isOwned   = petState?.owned;
    const level     = petState?.level || 0;
    const canUpgrade = isOwned && (state.shards >= rarity.shardCost);

    const effectLabel   = isOwned ? getPetEffectLabel(pet, level) : pet.description;
    const nextLabel     = isOwned ? getNextEffectLabel(pet, level) : "";
    const obtainHint    = getObtainHint(pet.rarity);

    return `
      <div class="pet-card ${isOwned ? "owned" : "unowned"} rarity-${pet.rarity}"
           style="--rarity-color: ${rarity.color}">

        <div class="pet-header">
          <span class="pet-rarity-badge" style="background:${rarity.color}20;color:${rarity.color};border:1px solid ${rarity.color}40">${rarity.label}</span>
          ${isOwned ? `<span class="pet-level">Lv.${level}</span>` : ""}
        </div>

        <div class="pet-icon">
          <i class="${pet.icon}" style="color:${rarity.color}"></i>
        </div>

        <div class="pet-name">${pet.name}</div>
        <div class="pet-effect">${effectLabel}</div>

        ${isOwned ? `
          <div class="pet-upgrade-row">
            <div class="pet-shard-cost">
              <span style="color:${rarity.color}">✦</span> ${shardCost(pet.rarity)}
              <span class="pet-next-effect">${nextLabel}</span>
            </div>
            <button class="pet-upgrade-btn ${canUpgrade ? "" : "disabled"}"
                    data-pet-upgrade="${petId}"
                    ${canUpgrade ? "" : "disabled"}>
              Upgrade
            </button>
          </div>
        ` : `
          <div class="pet-unowned-label">${obtainHint}</div>
        `}

      </div>
    `;
  }).join("");
}
