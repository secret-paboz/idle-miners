// ============================================================
// ECONOMY.JS — All game math, formulas, and loop logic
// ============================================================

import { state, saveState, resetStateForRebirth, resetStateForPrestige } from "./state.js";
import { getMineTier, rollOre, xpRequiredForLevel, ORE_TYPES } from "./data/mines-data.js";
import { getDimension } from "./data/dimensions-data.js";
import { PETS_DATA, RARITY_CONFIG } from "./data/pets-data.js";

// ============================================================
// SECTION 1 — UPGRADE COST FORMULAS
// ============================================================

// Pickaxe upgrade cost: 15 * (1.15 ^ (level - 1))
export function pickaxeUpgradeCost(level) {
  return Math.floor(15 * Math.pow(1.15, level - 1));
}

// Backpack upgrade cost: 25 * (1.15 ^ (level - 1))
export function backpackUpgradeCost(level) {
  return Math.floor(25 * Math.pow(1.15, level - 1));
}

// Pet upgrade cost: flat per rarity (never scales)
export function petUpgradeCost(petId, levels = 1) {
  const pet = PETS_DATA[petId];
  if (!pet) return Infinity;
  const costPerLevel = RARITY_CONFIG[pet.rarity].shardCost;
  return costPerLevel * levels;
}

// Prestige shop upgrade cost: 1 token per level
export function prestigeUpgradeCost(currentLevel) {
  return currentLevel + 1;
}

// ============================================================
// SECTION 2 — STAT COMPUTATIONS
// ============================================================

// Max backpack capacity
// Base: 20 + (backpackLevel * 15)
// Prestige bonus: +10 per storageLevel
// Pet bonus: sum of all owned common pets' backpack modifiers
export function computeMaxCapacity() {
  const base = 20 + (state.backpackLevel * 15);
  const prestigeBonus = state.prestigeUpgrades.storageLevel * 10;
  const petBonus = computePetBonus("backpack");
  return Math.floor(base * (1 + petBonus) + prestigeBonus);
}

// Mining power per tick
// Base: pickaxeLevel * 1
// Rage buff: 2x if active
// Speed booster: multiplier from crate booster
// Pet bonus: sum of all owned uncommon pets' speed modifiers
// Prestige bonus: +1 per speedLevel
export function computeMiningPower() {
  const prestigeBonus = state.prestigeUpgrades.speedLevel;
  const base = (state.pickaxeLevel * 1) + prestigeBonus;
  const petBonus = computePetBonus("mining");
  let power = base * (1 + petBonus);

  // Rage buff (wither legendary ability)
  if (state.buffs.rageActive && Date.now() < state.buffs.rageEndsAt) {
    power *= 2;
  } else if (state.buffs.rageActive) {
    state.buffs.rageActive = false;
    state.buffs.rageEndsAt = 0;
  }

  // Active speed booster from crates
  if (state.boosters.miningSpeed.endsAt > Date.now()) {
    power *= state.boosters.miningSpeed.multiplier;
  }

  return Math.max(1, Math.floor(power));
}

// Ore sell value per block
// Base: ore.baseValue * dimension.valueMulti
// Rebirth bonus: +10% per rebirth
// Wings buff: 2x if active
// Sell booster: multiplier from crate booster
// Pet bonus: sum of all owned rare pets' sell modifiers
// Prestige greed bonus: +2% per greedLevel
// Prestige merchant bonus: +5% per merchantLevel (on sell action)
// VIP bonus: 2x sell value (stacks on top of everything else)
export function computeOreValue(oreId, isSellAction = false) {
  const ore = ORE_TYPES[oreId];
  if (!ore) return 0;

  const dimension  = getDimension(state.dimension);
  const rebirthMod = 1 + (state.rebirths * 0.10);
  const greedMod   = 1 + (state.prestigeUpgrades.greedLevel * 0.02);
  const petBonus   = computePetBonus("sell");

  let value = ore.baseValue * dimension.valueMulti * rebirthMod * greedMod * (1 + petBonus);

  // Wings buff (enderdragon legendary ability)
  if (state.buffs.wingsActive && Date.now() < state.buffs.wingsEndsAt) {
    value *= 2;
  } else if (state.buffs.wingsActive) {
    state.buffs.wingsActive = false;
    state.buffs.wingsEndsAt = 0;
  }

  // Active sell booster from crates
  if (state.boosters.sellValue.endsAt > Date.now()) {
    value *= state.boosters.sellValue.multiplier;
  }

  // Merchant prestige bonus only on actual sell action
  if (isSellAction) {
    const merchantMod = 1 + (state.prestigeUpgrades.merchantLevel * 0.05);
    value *= merchantMod;
  }

  // VIP bonus: 2x sell value (always active while VIP)
  if (state.isVip && Date.now() < state.vipExpiresAt) {
    value *= 2;
  }

  return Math.floor(value);
}

// ============================================================
// SECTION 3 — PET BONUS CALCULATOR
// ============================================================

// Sums bonus from all owned pets of a given effect type
// effectType: "backpack" | "mining" | "sell"
export function computePetBonus(effectType) {
  let totalBonus = 0;
  for (const petId in state.pets) {
    const petState = state.pets[petId];
    if (!petState.owned) continue;

    const petData = PETS_DATA[petId];
    if (!petData) continue;

    const rarityConf = RARITY_CONFIG[petData.rarity];
    if (rarityConf.effectType !== effectType) continue;

    totalBonus += petData.modifier * petState.level;
  }
  return totalBonus;
}

// ============================================================
// SECTION 4 — CORE GAME ACTIONS
// ============================================================

// Called every 1000ms by main.js setInterval — NOT rate limited
// (trusted game loop, not user input)
// Returns: { oreMined, currentOre, maxCapacity, isFull }
export function tickMining() {
  const maxCap = computeMaxCapacity();
  if (state.ore >= maxCap) {
    return { oreMined: 0, currentOre: state.ore, maxCapacity: maxCap, isFull: true };
  }

  const power    = computeMiningPower();
  const mineTier = getMineTier(state.level);
  const ore      = rollOre(mineTier);
  const oreMined = Math.min(power, maxCap - state.ore);

  state.ore         += oreMined;
  state.blocksMined += oreMined;
  state.currentOreId = ore.id;

  // XP gain per block (boosted if xp booster active)
  let xpGained = ore.xpPerBlock * oreMined;
  if (state.boosters.xpGain.endsAt > Date.now()) {
    xpGained = Math.floor(xpGained * state.boosters.xpGain.multiplier);
  }
  state.xp += xpGained;

  checkLevelUp();

  return {
    oreMined,
    oreType:     ore,
    currentOre:  state.ore,
    maxCapacity: maxCap,
    isFull:      state.ore >= maxCap,
  };
}

// Sell all ore in backpack
// Returns: { cashEarned, oreType }
export function sellOre() {
  if (state.ore <= 0) return { cashEarned: 0 };

  const oreId  = state.currentOreId || "dirt";
  const ore    = ORE_TYPES[oreId] || ORE_TYPES["dirt"];
  const value  = computeOreValue(ore.id, true);
  const earned = Math.floor(state.ore * value);

  state.cash       += earned;
  state.cashEarned += earned;
  state.ore         = 0;

  saveState();

  return { cashEarned: earned, oreType: ore };
}

// ============================================================
// SECTION 4b — VIP AUTO-SELL
// ============================================================

// Called by main.js after every tickMining() when isFull === true.
// Only triggers if player is an active VIP.
// Intentionally bypasses rate limit — it's triggered by the
// trusted game loop, not a user button press.
// Returns: { triggered, cashEarned }
export function tryAutoSell() {
  const now = Date.now();

  if (!state.isVip || now >= state.vipExpiresAt) return { triggered: false };
  if (state.ore <= 0) return { triggered: false };

  const maxCap = computeMaxCapacity();
  if (state.ore < maxCap) return { triggered: false };

  // Bypass rate limit for auto-sell (game loop trigger, not user input)
  if (state.ore <= 0) return { triggered: false };

  const oreId  = state.currentOreId || "dirt";
  const ore    = ORE_TYPES[oreId] || ORE_TYPES["dirt"];
  const value  = computeOreValue(ore.id, true);
  const earned = Math.floor(state.ore * value);

  state.cash       += earned;
  state.cashEarned += earned;
  state.ore         = 0;

  saveState();

  return { triggered: true, cashEarned: earned };
}

// Upgrade pickaxe
// Returns: { success, newLevel, cost, message }
export function upgradePickaxe() {
  const cost = pickaxeUpgradeCost(state.pickaxeLevel);
  if (state.cash < cost) {
    return { success: false, message: `Need $${formatNumber(cost)}` };
  }
  state.cash -= cost;
  state.pickaxeLevel += 1;
  saveState();
  return {
    success:  true,
    newLevel: state.pickaxeLevel,
    cost,
    message:  `Pickaxe upgraded to level ${state.pickaxeLevel}!`,
  };
}

// Upgrade backpack
// Returns: { success, newLevel, cost, message }
export function upgradeBackpack() {
  const cost = backpackUpgradeCost(state.backpackLevel);
  if (state.cash < cost) {
    return { success: false, message: `Need $${formatNumber(cost)}` };
  }
  state.cash -= cost;
  state.backpackLevel += 1;
  saveState();
  return {
    success:  true,
    newLevel: state.backpackLevel,
    cost,
    message:  `Backpack upgraded to level ${state.backpackLevel}!`,
  };
}

// Upgrade a pet (costs shards, flat rate)
// Returns: { success, newLevel, cost, message }
export function upgradePet(petId, levels = 1) {
  const petData  = PETS_DATA[petId];
  const petState = state.pets[petId];
  if (!petData || !petState || !petState.owned) {
    return { success: false, message: "Pet not owned." };
  }
  if (petState.level >= petData.maxLevel) {
    return { success: false, message: "Pet is at max level!" };
  }

  const actualLevels = Math.min(levels, petData.maxLevel - petState.level);
  const cost = petUpgradeCost(petId, actualLevels);

  if (state.shards < cost) {
    return { success: false, message: `Need ${cost} shards.` };
  }

  state.shards    -= cost;
  petState.level  += actualLevels;
  saveState();

  return {
    success:  true,
    newLevel: petState.level,
    cost,
    message:  `${petData.name} upgraded to level ${petState.level}!`,
  };
}

// Activate legendary pet ability
// Returns: { success, message, duration }
export function activateAbility(petId) {
  const petData  = PETS_DATA[petId];
  const petState = state.pets[petId];

  if (!petData?.ability || !petState?.owned) {
    return { success: false, message: "Pet not owned or no ability." };
  }

  const ability  = petData.ability;
  const now      = Date.now();
  const lastUsed = state[ability.timeKey] || 0;

  if (now - lastUsed < ability.cooldown) {
    const remaining = Math.ceil((ability.cooldown - (now - lastUsed)) / 1000);
    return { success: false, message: `Cooldown: ${remaining}s remaining.` };
  }

  state.buffs[ability.buffKey]   = true;
  state.buffs[ability.endsAtKey] = now + ability.duration;
  state[ability.timeKey]         = now;
  saveState();

  return {
    success:  true,
    message:  `${ability.name} activated! ${ability.effect} for 60 seconds.`,
    duration: ability.duration,
  };
}

// Switch active dimension
export function switchDimension(dimensionId) {
  if (!state.dimensionUnlocked.includes(dimensionId)) {
    return { success: false, message: "Dimension not unlocked." };
  }
  state.dimension = dimensionId;
  saveState();
  return { success: true, message: `Entered ${dimensionId}.` };
}

// ============================================================
// SECTION 5 — LEVEL UP LOGIC
// ============================================================

function checkLevelUp() {
  const xpNeeded = xpRequiredForLevel(state.level + 1);
  if (state.xp >= xpNeeded) {
    state.level += 1;
    return true;
  }
  return false;
}

// ============================================================
// SECTION 6 — REBIRTH & PRESTIGE GATES
// ============================================================

export function canRebirth() {
  return state.pickaxeLevel >= 200 && state.backpackLevel >= 200;
}

export function canPrestige() {
  return state.rebirths >= 25 && state.pickaxeLevel >= 200 && state.backpackLevel >= 200;
}

export function doRebirth() {
  if (!canRebirth()) {
    return { success: false, message: "Need pickaxe & backpack at level 200." };
  }
  resetStateForRebirth();
  return { success: true, message: `Rebirth ${state.rebirths} complete! +10% sell value.` };
}

export function doPrestige() {
  if (!canPrestige()) {
    return { success: false, message: "Need 25 rebirths + level 200 gear." };
  }
  resetStateForPrestige();
  return { success: true, message: `Prestige ${state.prestiges} complete! +1 Prestige Token.` };
}

// Buy prestige shop upgrade
export function buyPrestigeUpgrade(upgradeKey) {
  const validKeys = ["merchantLevel", "greedLevel", "speedLevel", "storageLevel"];
  if (!validKeys.includes(upgradeKey)) {
    return { success: false, message: "Invalid upgrade." };
  }
  const currentLevel = state.prestigeUpgrades[upgradeKey];
  const cost = prestigeUpgradeCost(currentLevel);

  if (state.prestigeTokens < cost) {
    return { success: false, message: `Need ${cost} prestige tokens.` };
  }

  state.prestigeTokens -= cost;
  state.prestigeUpgrades[upgradeKey] += 1;
  saveState();

  return {
    success:  true,
    newLevel: state.prestigeUpgrades[upgradeKey],
    message:  `${upgradeKey} upgraded to level ${state.prestigeUpgrades[upgradeKey]}!`,
  };
}

// ============================================================
// SECTION 7 — OFFLINE PROGRESSION
// ============================================================

// Called on game load — calculates what was mined while offline.
// Caps at 8 hours for non-VIP, 12 hours for VIP players.
// If VIP: also auto-sells all ore earned offline.
// Returns: { seconds, mined, hours, cashEarned (VIP only) }
export function calculateOfflineProgress() {
  if (!state.lastOnlineTime) return null;

  const now     = Date.now();
  const elapsed = now - state.lastOnlineTime;

  // Guard: reject negative, zero, or implausibly large elapsed times
  if (!isFinite(elapsed) || elapsed <= 0 || elapsed > 30 * 24 * 60 * 60 * 1000) return null;

  // VIP gets 12h offline cap, regular players get 8h
  const isActiveVip = state.isVip && now < state.vipExpiresAt;
  const maxOffline  = isActiveVip
    ? 12 * 60 * 60 * 1000
    :  8 * 60 * 60 * 1000;

  const effectiveMs = Math.min(elapsed, maxOffline);
  const seconds     = Math.floor(effectiveMs / 1000);

  if (seconds < 10) return null;

  const power     = computeMiningPower();
  const maxCap    = computeMaxCapacity();
  const remaining = Math.max(0, maxCap - state.ore);
  const mined     = Math.min(power * seconds, remaining);

  if (mined <= 0) return null;

  state.ore         = Math.min(state.ore + mined, maxCap);
  state.blocksMined += mined;

  // Award XP for offline blocks
  const mineTier = getMineTier(state.level);
  const ore      = rollOre(mineTier);
  let xpGained   = ore.xpPerBlock * mined;
  if (state.boosters.xpGain.endsAt > now) {
    xpGained = Math.floor(xpGained * state.boosters.xpGain.multiplier);
  }
  state.xp += xpGained;
  checkLevelUp();

  // VIP: auto-sell everything mined offline instantly (bypass rate limit)
  let cashEarned = 0;
  if (isActiveVip && state.ore > 0) {
    const oreId  = state.currentOreId || "dirt";
    const oreObj = ORE_TYPES[oreId] || ORE_TYPES["dirt"];
    const value  = computeOreValue(oreObj.id, true);
    cashEarned   = Math.floor(state.ore * value);
    state.cash       += cashEarned;
    state.cashEarned += cashEarned;
    state.ore         = 0;
    saveState();
  }

  return {
    seconds,
    mined,
    hours: (seconds / 3600).toFixed(1),
    cashEarned,
    isVip: isActiveVip,
  };
}

// ============================================================
// SECTION 8 — NUMBER FORMATTER
// ============================================================

export function formatNumber(n) {
  if (n >= 1e18) return (n / 1e18).toFixed(2) + "Qi";
  if (n >= 1e15) return (n / 1e15).toFixed(2) + "Qa";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + "K";
  return Math.floor(n).toLocaleString();
}
