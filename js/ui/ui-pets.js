// ============================================================
// UI-PETS.JS — Pets panel renderer
// Covers: hunt/fish cooldown buttons, pet grid with
//         owned/unowned states, upgrade rows
//
// CHANGED:
// - Removed all legendary ability button rendering (abilityHTML)
// - Removed canActivate / pet.ability checks
// - Legendary pets now show their passive effect label instead
// - Removed getActiveAbilities import (function deleted in pets.js)
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

  const huntReady     = now - (state.lastHuntTime || 0) >= COOLDOWNS.hunt;
  const fishReady     = now - (state.lastFishTime || 0) >= COOLDOWNS.fish;
  const huntRemaining = huntReady ? 0 : Math.ceil((COOLDOWNS.hunt - (now - state.lastHuntTime)) / 1000);
  const fishRemaining = fishReady ? 0 : Math.ceil((COOLDOWNS.fish - (now - state.lastFishTime)) / 1000);

  setText("btn-hunt-timer", huntReady ? "Ready!" : formatCooldown(huntRemaining));
  toggleClass("btn-hunt", "ready",       huntReady);
  toggleClass("btn-hunt", "on-cooldown", !huntReady);

  setText("btn-fish-timer", fishReady ? "Ready!" : formatCooldown(fishRemaining));
  toggleClass("btn-fish", "ready",       fishReady);
  toggleClass("btn-fish", "on-cooldown", !fishReady);
}

// ============================================================
// SECTION 3 — PET GRID
// ============================================================

// Returns a human-readable passive effect label for each pet.
function getPetEffectLabel(pet) {
  const level = state.pets[pet.id]?.level || 1;

  switch (pet.rarity) {
    case "common":
      return `+${(pet.modifier * level * 100).toFixed(0)}% backpack capacity`;
    case "uncommon":
      return `+${(pet.modifier * level * 100).toFixed(0)}% mining speed`;
    case "rare":
      return `+${(pet.modifier * level * 100).toFixed(0)}% sell value`;
    case "legendary":
      // Legendary shows which passive pool it feeds and current bonus
      const effectName = pet.legendaryEffect === "mining" ? "mining speed" : "sell value";
      return `+${(pet.modifier * level * 100).toFixed(0)}% ${effectName} (passive)`;
    default:
      return pet.description;
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

  const allPets = [...owned, ...unowned];

  container.innerHTML = allPets.map(({ petId, pet, petState }) => {
    const rarity  = RARITY_CONFIG[pet.rarity];
    const isOwned = petState?.owned;
    const level   = petState?.level || 0;

    const effectLabel = isOwned ? getPetEffectLabel(pet) : pet.description;

    return `
      <div class="pet-card ${isOwned ? "owned" : "unowned"} rarity-${pet.rarity}"
           style="--rarity-color: ${rarity.color}">
        <div class="pet-header">
          <span class="pet-rarity-badge" style="background:${rarity.color}">${pet.rarity}</span>
          ${isOwned ? `<span class="pet-level">Lv.${level}</span>` : ""}
        </div>
        <div class="pet-icon">
          <i class="${pet.icon}" style="color:${rarity.color}"></i>
        </div>
        <div class="pet-name">${pet.name}</div>
        <div class="pet-effect">${effectLabel}</div>
        ${isOwned ? `
          <div class="pet-upgrade-row">
            <span class="pet-shard-cost">✦ ${shardCost(pet.rarity)}/lv</span>
            <button class="pet-upgrade-btn" data-pet-upgrade="${petId}">Upgrade</button>
          </div>
        ` : `
          <div class="pet-unowned-label">Not yet obtained</div>
        `}
      </div>
    `;
  }).join("");
}
