// ============================================================
// PETS.JS — Hunt, fish, and loot RNG mechanics
//
// CHANGED:
// - doFish() cash reward is now dynamic — scales with
//   state.rebirths and current ore value instead of flat $50.
//   Formula: base $50 * (1 + rebirths * 0.10) * dimMultiplier
//   This matches how ore sell value scales with rebirths.
// - getActiveAbilities() removed — no more active abilities.
//   Legendary pets are now passive (handled in economy.js).
// ============================================================

import { state, saveState } from "./state.js";
import { PETS_DATA, HUNT_TABLE, FISH_TABLE, COOLDOWNS } from "./data/pets-data.js";
import { getDimension } from "./data/dimensions-data.js";

function rollWeighted(table) {
  const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return table[table.length - 1];
}

function getCooldownRemaining(lastTimeKey, cooldownMs) {
  const lastTime  = state[lastTimeKey] || 0;
  const elapsed   = Date.now() - lastTime;
  const remaining = cooldownMs - elapsed;
  return remaining > 0 ? remaining : 0;
}

function formatCooldown(ms) {
  if (ms <= 0) return "Ready";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Calculate dynamic fish cash reward.
// Scales with rebirths and current dimension multiplier.
// Base $50 * rebirth bonus * dimension multiplier.
// Capped so early players still get a meaningful but small reward.
function calcFishCashReward() {
  const rebirthMod = 1 + (state.rebirths * 0.10);
  const dimension  = getDimension(state.dimension);
  const dimMod     = dimension.valueMulti || 1;
  return Math.floor(50 * rebirthMod * dimMod);
}

export function doHunt() {
  const cooldown = getCooldownRemaining("lastHuntTime", COOLDOWNS.hunt);
  if (cooldown > 0) {
    return {
      success:           false,
      cooldownRemaining: cooldown,
      message:           `Hunt on cooldown: ${formatCooldown(cooldown)}`,
    };
  }

  state.lastHuntTime = Date.now();
  const rolled       = rollWeighted(HUNT_TABLE);

  if (rolled.type === "pet") {
    const petId   = rolled.petId;
    const petData = PETS_DATA[petId];
    const isNew   = !state.pets[petId]?.owned;

    if (isNew) {
      state.pets[petId] = { owned: true, level: 1 };
    } else {
      const shardBonus = 3;
      state.shards += shardBonus;
      saveState();
      return {
        success: true,
        result:  { type: "duplicate", petId, petData, shards: shardBonus },
        message: `Already own ${petData.name}! Got ${shardBonus} shards instead.`,
        cooldownRemaining: 0,
      };
    }

    saveState();
    return {
      success: true,
      result:  { type: "pet", petId, petData, isNew: true },
      message: `You caught a ${petData.name}! (${petData.rarity})`,
      cooldownRemaining: 0,
    };
  }

  if (rolled.type === "shards") {
    state.shards += rolled.amount;
    saveState();
    return {
      success: true,
      result:  { type: "shards", amount: rolled.amount },
      message: `Hunt returned ${rolled.amount} shards.`,
      cooldownRemaining: 0,
    };
  }

  saveState();
  return {
    success: true,
    result:  { type: "nothing" },
    message: "You found nothing this time.",
    cooldownRemaining: 0,
  };
}

export function doFish() {
  const cooldown = getCooldownRemaining("lastFishTime", COOLDOWNS.fish);
  if (cooldown > 0) {
    return {
      success:           false,
      cooldownRemaining: cooldown,
      message:           `Fishing on cooldown: ${formatCooldown(cooldown)}`,
    };
  }

  state.lastFishTime = Date.now();
  const rolled       = rollWeighted(FISH_TABLE);

  if (rolled.type === "shards") {
    state.shards += rolled.amount;
    saveState();
    return {
      success: true,
      result:  { type: "shards", amount: rolled.amount, label: rolled.label },
      message: `${rolled.label}! +${rolled.amount} shards.`,
      cooldownRemaining: 0,
    };
  }

  if (rolled.type === "cash") {
    // Dynamic cash reward — scales with rebirths + dimension
    const amount = calcFishCashReward();
    state.cash       += amount;
    state.cashEarned += amount;
    saveState();
    return {
      success: true,
      result:  { type: "cash", amount, label: rolled.label },
      message: `${rolled.label}! +$${amount}.`,
      cooldownRemaining: 0,
    };
  }

  // junk
  saveState();
  return {
    success: true,
    result:  { type: "junk", label: rolled.label },
    message: `${rolled.label}. Better luck next time.`,
    cooldownRemaining: 0,
  };
}

export function claimHourly() {
  const cooldown = getCooldownRemaining("lastHourlyTime", COOLDOWNS.hourly);
  if (cooldown > 0) return { success: false, message: `Hourly ready in: ${formatCooldown(cooldown)}` };
  const reward = 5;
  state.shards        += reward;
  state.lastHourlyTime = Date.now();
  saveState();
  return { success: true, message: `Hourly claimed! +${reward} shards.`, reward: { type: "shards", amount: reward } };
}

export function claimDaily() {
  const cooldown = getCooldownRemaining("lastDailyTime", COOLDOWNS.daily);
  if (cooldown > 0) return { success: false, message: `Daily ready in: ${formatCooldown(cooldown)}` };
  const shards = 20, cash = 500;
  state.shards        += shards;
  state.cash          += cash;
  state.cashEarned    += cash;
  state.lastDailyTime  = Date.now();
  saveState();
  return { success: true, message: `Daily claimed! +${shards} shards & +$${cash}.`, reward: { type: "both", shards, cash } };
}

export function claimWeekly() {
  const cooldown = getCooldownRemaining("lastWeeklyTime", COOLDOWNS.weekly);
  if (cooldown > 0) return { success: false, message: `Weekly ready in: ${formatCooldown(cooldown)}` };
  const shards = 100, cash = 5000;
  state.shards         += shards;
  state.cash           += cash;
  state.cashEarned     += cash;
  state.lastWeeklyTime  = Date.now();
  saveState();
  return { success: true, message: `Weekly claimed! +${shards} shards & +$${cash}.`, reward: { type: "both", shards, cash } };
}

export function getCooldownStatus() {
  return {
    hunt:   { remaining: getCooldownRemaining("lastHuntTime",   COOLDOWNS.hunt),   formatted: formatCooldown(getCooldownRemaining("lastHuntTime",   COOLDOWNS.hunt)),   ready: getCooldownRemaining("lastHuntTime",   COOLDOWNS.hunt)   === 0 },
    fish:   { remaining: getCooldownRemaining("lastFishTime",   COOLDOWNS.fish),   formatted: formatCooldown(getCooldownRemaining("lastFishTime",   COOLDOWNS.fish)),   ready: getCooldownRemaining("lastFishTime",   COOLDOWNS.fish)   === 0 },
    hourly: { remaining: getCooldownRemaining("lastHourlyTime", COOLDOWNS.hourly), formatted: formatCooldown(getCooldownRemaining("lastHourlyTime", COOLDOWNS.hourly)), ready: getCooldownRemaining("lastHourlyTime", COOLDOWNS.hourly) === 0 },
    daily:  { remaining: getCooldownRemaining("lastDailyTime",  COOLDOWNS.daily),  formatted: formatCooldown(getCooldownRemaining("lastDailyTime",  COOLDOWNS.daily)),  ready: getCooldownRemaining("lastDailyTime",  COOLDOWNS.daily)  === 0 },
    weekly: { remaining: getCooldownRemaining("lastWeeklyTime", COOLDOWNS.weekly), formatted: formatCooldown(getCooldownRemaining("lastWeeklyTime", COOLDOWNS.weekly)), ready: getCooldownRemaining("lastWeeklyTime", COOLDOWNS.weekly) === 0 },
  };
}

export function getOwnedPets() {
  return Object.entries(state.pets)
    .filter(([, p]) => p.owned)
    .map(([petId, petState]) => ({ ...PETS_DATA[petId], level: petState.level, petState }));
}

export function getUndiscoveredPets() {
  return Object.values(PETS_DATA).filter(p => !state.pets[p.id]?.owned);
}

export function getPetsByRarity(rarity) {
  return Object.values(PETS_DATA).filter(p => p.rarity === rarity);
}
