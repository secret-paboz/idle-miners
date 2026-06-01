// ============================================================
// PRESTIGE.JS — Prestige gate, shop, and token management
// ============================================================

import { state, saveState } from "./state.js";
import { canPrestige, doPrestige, buyPrestigeUpgrade, prestigeUpgradeCost } from "./economy.js";

// ============================================================
// SECTION 1 — PRESTIGE SHOP DEFINITIONS
// ============================================================

// Each upgrade has a key matching state.prestigeUpgrades
// maxLevel: how many times it can be purchased
// effect: describes what each level does (for UI display)

export const PRESTIGE_SHOP = [
  {
    key:         "merchantLevel",
    name:        "Merchant",
    description: "Increases cash earned on every sell action.",
    icon:        "fa-solid fa-coins",
    color:       "#ffc107",
    glowColor:   "rgba(255,193,7,0.3)",
    maxLevel:    20,
    effectPerLevel: "+5% sell cash",
    effect: (level) => `+${level * 5}% sell bonus`,
  },
  {
    key:         "greedLevel",
    name:        "Greed",
    description: "Permanently increases the base value of all ore.",
    icon:        "fa-solid fa-gem",
    color:       "#00bcd4",
    glowColor:   "rgba(0,188,212,0.3)",
    maxLevel:    20,
    effectPerLevel: "+2% ore value",
    effect: (level) => `+${level * 2}% ore value`,
  },
  {
    key:         "speedLevel",
    name:        "Overdrive",
    description: "Adds flat mining speed on top of your pickaxe level.",
    icon:        "fa-solid fa-bolt",
    color:       "#ff5722",
    glowColor:   "rgba(255,87,34,0.3)",
    maxLevel:    20,
    effectPerLevel: "+1 base mining speed",
    effect: (level) => `+${level} base mining speed`,
  },
  {
    key:         "storageLevel",
    name:        "Expansion",
    description: "Adds flat backpack capacity on top of your backpack level.",
    icon:        "fa-solid fa-bag-shopping",
    color:       "#4caf50",
    glowColor:   "rgba(76,175,80,0.3)",
    maxLevel:    20,
    effectPerLevel: "+10 backpack capacity",
    effect: (level) => `+${level * 10} backpack capacity`,
  },
];

// ============================================================
// SECTION 2 — PRESTIGE STATUS
// ============================================================

export function getPrestigeStatus() {
  const eligible = canPrestige();

  return {
    prestiges:       state.prestiges,
    prestigeTokens:  state.prestigeTokens,
    rebirths:        state.rebirths,
    rebirthsNeeded:  25,
    eligible,
    pickaxeReady:    state.pickaxeLevel >= 200,
    backpackReady:   state.backpackLevel >= 200,
    rebirthsReady:   state.rebirths >= 25,
    upgrades:        getUpgradeStatus(),
  };
}

// ============================================================
// SECTION 3 — UPGRADE STATUS
// ============================================================

export function getUpgradeStatus() {
  return PRESTIGE_SHOP.map(upgrade => {
    const currentLevel = state.prestigeUpgrades[upgrade.key] || 0;
    const maxed        = currentLevel >= upgrade.maxLevel;
    const cost         = maxed ? null : prestigeUpgradeCost(currentLevel);
    const canAfford    = !maxed && state.prestigeTokens >= cost;

    return {
      ...upgrade,
      currentLevel,
      maxed,
      cost,
      canAfford,
      currentEffect: upgrade.effect(currentLevel),
      nextEffect:    maxed ? null : upgrade.effect(currentLevel + 1),
    };
  });
}

// ============================================================
// SECTION 4 — BUY UPGRADE (wrapper with validation)
// ============================================================

export function purchasePrestigeUpgrade(upgradeKey) {
  const shopItem = PRESTIGE_SHOP.find(u => u.key === upgradeKey);
  if (!shopItem) {
    return { success: false, message: "Invalid upgrade key." };
  }

  const currentLevel = state.prestigeUpgrades[upgradeKey] || 0;
  if (currentLevel >= shopItem.maxLevel) {
    return { success: false, message: `${shopItem.name} is already maxed!` };
  }

  const result = buyPrestigeUpgrade(upgradeKey);
  return result;
}

// ============================================================
// SECTION 5 — TRIGGER PRESTIGE
// ============================================================

export function triggerPrestige() {
  if (!canPrestige()) {
    const reasons = [];
    if (state.rebirths < 25)       reasons.push(`${25 - state.rebirths} more rebirths needed`);
    if (state.pickaxeLevel < 200)  reasons.push(`Pickaxe needs level 200`);
    if (state.backpackLevel < 200) reasons.push(`Backpack needs level 200`);
    return {
      success: false,
      message: "Cannot prestige yet.",
      reasons,
    };
  }

  logPrestigeEvent("prestige", {
    rebirths:       state.rebirths,
    pickaxeLevel:   state.pickaxeLevel,
    backpackLevel:  state.backpackLevel,
    prestigeTokens: state.prestigeTokens,
  });

  const result = doPrestige();
  return result;
}

// ============================================================
// SECTION 6 — PRESTIGE PROGRESS (for UI progress bars)
// ============================================================

export function getPrestigeProgress() {
  return {
    rebirths: {
      current: state.rebirths,
      needed:  25,
      percent: Math.min((state.rebirths / 25) * 100, 100),
      done:    state.rebirths >= 25,
    },
    pickaxe: {
      current: state.pickaxeLevel,
      needed:  200,
      percent: Math.min((state.pickaxeLevel / 200) * 100, 100),
      done:    state.pickaxeLevel >= 200,
    },
    backpack: {
      current: state.backpackLevel,
      needed:  200,
      percent: Math.min((state.backpackLevel / 200) * 100, 100),
      done:    state.backpackLevel >= 200,
    },
  };
}

// ============================================================
// SECTION 7 — REBIRTH PROGRESS (for UI)
// ============================================================

export function getRebirthProgress() {
  return {
    pickaxe: {
      current: state.pickaxeLevel,
      needed:  200,
      percent: Math.min((state.pickaxeLevel / 200) * 100, 100),
      done:    state.pickaxeLevel >= 200,
    },
    backpack: {
      current: state.backpackLevel,
      needed:  200,
      percent: Math.min((state.backpackLevel / 200) * 100, 100),
      done:    state.backpackLevel >= 200,
    },
    canRebirth: state.pickaxeLevel >= 200 && state.backpackLevel >= 200,
  };
}

// ============================================================
// SECTION 8 — PRESTIGE HISTORY LOG (lightweight)
// ============================================================

const PRESTIGE_LOG_KEY = "idle_miners_prestige_log";

export function logPrestigeEvent(type, data = {}) {
  try {
    const log   = JSON.parse(localStorage.getItem(PRESTIGE_LOG_KEY) || "[]");
    const entry = {
      type,
      timestamp: Date.now(),
      rebirths:  state.rebirths,
      prestiges: state.prestiges,
      ...data,
    };
    log.push(entry);
    // Keep last 50 events only
    if (log.length > 50) log.shift();
    localStorage.setItem(PRESTIGE_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.warn("Failed to log prestige event:", e);
  }
}

export function getPrestigeLog() {
  try {
    return JSON.parse(localStorage.getItem(PRESTIGE_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}
