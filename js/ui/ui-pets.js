// ============================================================
// UI-PETS.JS — Pets panel renderer
// Covers: hunt/fish cooldown buttons, pet grid with
//         owned/unowned states, upgrade rows, legendary abilities
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

function renderPetCooldowns() {
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
    const rarity      = RARITY_CONFIG[pet.rarity];
    const isOwned     = petState?.owned;
    const level       = petState?.level || 0;
    const isLegend    = pet.rarity === "legendary";
    const canActivate = isLegend && isOwned;

    let abilityHTML = "";
    if (canActivate && pet.ability) {
      const lastUsed   = state[pet.ability.timeKey] || 0;
      const onCD       = Date.now() - lastUsed < pet.ability.cooldown;
      const remaining  = onCD ? Math.ceil((pet.ability.cooldown - (Date.now() - lastUsed)) / 1000) : 0;
      const buffActive = state.buffs[pet.ability.buffKey];

      abilityHTML = `
        <button class="pet-ability-btn ${buffActive ? "active" : ""} ${onCD && !buffActive ? "on-cooldown" : ""}"
                data-pet-ability="${petId}">
          <i class="${pet.ability.icon}"></i>
          ${buffActive ? "Active" : onCD ? formatCooldown(remaining) : pet.ability.name}
        </button>
      `;
    }

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
        <div class="pet-effect">${pet.description}</div>
        ${isOwned ? `
          <div class="pet-upgrade-row">
            <span class="pet-shard-cost">✦ ${shardCost(pet.rarity)}/lv</span>
            <button class="pet-upgrade-btn" data-pet-upgrade="${petId}">Upgrade</button>
          </div>
          ${abilityHTML}
        ` : `
          <div class="pet-unowned-label">Not yet obtained</div>
        `}
      </div>
    `;
  }).join("");
}
