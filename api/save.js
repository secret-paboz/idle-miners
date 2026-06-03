// ============================================================
// api/save.js — Server-side save validator
//
// Pipeline:
//   1. Verify JWT — confirm the request comes from a real session
//   2. Fetch player role from Supabase
//      - role === 99 (GM) → skip math validation, save as-is
//      - role !== 99      → run full math validation
//   3. Math validation — recalculate theoretical max stats
//      using the player's OWN submitted values as inputs.
//      If submitted cash/ore/shards exceed what's possible
//      given their pickaxe, backpack, pets, boosters, rebirths
//      and time played → reject the save.
//   4. Write to Supabase via service role key
//
// CHANGED:
// - Removed ABILITY_BUFF_MULTI constant (rage/wings no longer exist)
// - maxMiningPower() — removed rage buff multiplier
// - maxOreValue()    — removed wings buff multiplier
// - Legendary pets now feed into mining/sell bonus pools
//   using their legendaryEffect field (matches economy.js)
// - RARITY_EFFECT updated: legendary maps to null (handled per-pet)
// - PET_DEFS updated: wither → legendaryEffect "mining",
//   enderdragon → legendaryEffect "sell"
// - computePetBonuses() updated to handle legendary per-pet effect
// - prestigeTokens max cap reduced from 999 to match flat-1-token
//   cost: at 20 levels × 4 upgrades = 80 tokens needed to max all.
//   Cap stays at 999 (generous, fine as-is).
//
// POST /api/save
// Headers: Authorization: Bearer <supabase_jwt>
// Body: { userId, gameData }
// Returns: { success, message }
// ============================================================

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url        = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase admin credentials not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// ============================================================
// SECTION 1 — GAME CONSTANTS
// Keep in sync with client-side data files.
// ============================================================

const MAX_ORE_BASE_VALUE         = 5000;   // ancientDebris
const MAX_DIMENSION_MULTI        = 150.0;  // aether
const MAX_PICKAXE_LEVEL          = 200;
const MAX_BACKPACK_LEVEL         = 200;
const MAX_PRESTIGE_UPGRADE_LEVEL = 20;
const MAX_REBIRTHS               = 999;
const MAX_PRESTIGES              = 999;
const MAX_PRESTIGE_TOKENS        = 999;
const MAX_LEVEL                  = 10000;
const MAX_PET_SELL_BONUS         = 20.0;
const MAX_PET_MINING_BONUS       = 20.0;
const MAX_PET_BACKPACK_BONUS     = 20.0;
const MAX_BOOSTER_MULTI          = 10.0;
const VIP_SELL_MULTI             = 2.0;

const VALID_DIMENSIONS = [
  "earth", "cave", "snow", "nether",
  "crimson", "warped", "end", "void", "aether"
];

const VALID_PRESTIGE_KEYS = [
  "merchantLevel", "greedLevel", "speedLevel", "storageLevel"
];

// Mirrored from pets-data.js
// legendaryEffect: which bonus pool the legendary pet feeds into
const PET_DEFS = {
  chicken:     { rarity: "common",    modifier: 0.05, maxLevel: 50 },
  cow:         { rarity: "common",    modifier: 0.06, maxLevel: 50 },
  pig:         { rarity: "common",    modifier: 0.06, maxLevel: 50 },
  sheep:       { rarity: "common",    modifier: 0.07, maxLevel: 50 },
  creeper:     { rarity: "uncommon",  modifier: 0.08, maxLevel: 50 },
  zombie:      { rarity: "uncommon",  modifier: 0.08, maxLevel: 50 },
  skeleton:    { rarity: "uncommon",  modifier: 0.09, maxLevel: 50 },
  spider:      { rarity: "uncommon",  modifier: 0.10, maxLevel: 50 },
  blaze:       { rarity: "rare",      modifier: 0.12, maxLevel: 40 },
  enderman:    { rarity: "rare",      modifier: 0.13, maxLevel: 40 },
  guardian:    { rarity: "rare",      modifier: 0.15, maxLevel: 40 },
  wither:      { rarity: "legendary", modifier: 0.20, maxLevel: 30, legendaryEffect: "mining" },
  enderdragon: { rarity: "legendary", modifier: 0.20, maxLevel: 30, legendaryEffect: "sell"   },
};

// For common/uncommon/rare — legendary handled per-pet via legendaryEffect
const RARITY_EFFECT = {
  common:    "backpack",
  uncommon:  "mining",
  rare:      "sell",
  legendary: null,
};

// ============================================================
// SECTION 2 — PET BONUS CALCULATOR
// ============================================================

function computePetBonuses(pets) {
  let miningBonus = 0, backpackBonus = 0, sellBonus = 0;
  if (!pets || typeof pets !== "object") return { miningBonus, backpackBonus, sellBonus };

  for (const [petId, petState] of Object.entries(pets)) {
    if (!petState?.owned) continue;
    const def = PET_DEFS[petId];
    if (!def) continue;

    const level = Math.min(petState.level || 1, def.maxLevel);
    const bonus = def.modifier * level;

    if (def.rarity === "legendary") {
      // Legendary: use per-pet legendaryEffect field
      if (def.legendaryEffect === "mining") miningBonus  += bonus;
      if (def.legendaryEffect === "sell")   sellBonus    += bonus;
    } else {
      const effect = RARITY_EFFECT[def.rarity];
      if (effect === "backpack") backpackBonus += bonus;
      if (effect === "mining")   miningBonus   += bonus;
      if (effect === "sell")     sellBonus     += bonus;
    }
  }

  return { miningBonus, backpackBonus, sellBonus };
}

// ============================================================
// SECTION 3 — THEORETICAL MAX CALCULATORS
// Uses player's OWN submitted stats as inputs, then applies
// every possible booster on top as a generous ceiling.
// ============================================================

function maxMiningPower(d, petBonuses) {
  const speedPrestige = Math.min(d.prestigeUpgrades?.speedLevel || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const base          = Math.min(d.pickaxeLevel, MAX_PICKAXE_LEVEL) + speedPrestige;
  const petBonus      = Math.min(petBonuses.miningBonus, MAX_PET_MINING_BONUS);
  // No rage buff multiplier — legendary pets are now passive
  let power = base * (1 + petBonus);
  power *= MAX_BOOSTER_MULTI;  // speed booster (crate)
  return Math.ceil(power);
}

function maxCapacity(d, petBonuses) {
  const storagePrestige = Math.min(d.prestigeUpgrades?.storageLevel || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const base            = 20 + (Math.min(d.backpackLevel, MAX_BACKPACK_LEVEL) * 15);
  const petBonus        = Math.min(petBonuses.backpackBonus, MAX_PET_BACKPACK_BONUS);
  return Math.ceil((base * (1 + petBonus)) + (storagePrestige * 10));
}

function maxOreValue(d, petBonuses) {
  const rebirths    = Math.min(d.rebirths || 0, MAX_REBIRTHS);
  const greedLevel  = Math.min(d.prestigeUpgrades?.greedLevel    || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const merchantLvl = Math.min(d.prestigeUpgrades?.merchantLevel  || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const petBonus    = Math.min(petBonuses.sellBonus, MAX_PET_SELL_BONUS);

  // No wings buff multiplier — legendary pets are now passive
  let value = MAX_ORE_BASE_VALUE
    * MAX_DIMENSION_MULTI
    * (1 + rebirths    * 0.10)
    * (1 + greedLevel  * 0.02)
    * (1 + merchantLvl * 0.05)
    * (1 + petBonus);

  value *= MAX_BOOSTER_MULTI;  // sell booster (crate)
  value *= VIP_SELL_MULTI;     // VIP bonus

  return Math.ceil(value);
}

// ============================================================
// SECTION 4 — VALIDATION
// ============================================================

function validateGameData(d) {
  const errors = [];

  function num(val, min, max, label) {
    if (typeof val !== "number" || !isFinite(val) || val < min || val > max) {
      errors.push(`${label}: invalid (got ${val}, expected ${min}–${max})`);
      return false;
    }
    return true;
  }

  // ── Basic field checks ────────────────────────────────
  num(d.cash,           0, Number.MAX_SAFE_INTEGER, "cash");
  num(d.cashEarned,     0, Number.MAX_SAFE_INTEGER, "cashEarned");
  num(d.shards,         0, 1_000_000,               "shards");
  num(d.ore,            0, Number.MAX_SAFE_INTEGER, "ore");
  num(d.level,          1, MAX_LEVEL,               "level");
  num(d.xp,             0, Number.MAX_SAFE_INTEGER, "xp");
  num(d.blocksMined,    0, Number.MAX_SAFE_INTEGER, "blocksMined");
  num(d.pickaxeLevel,   1, MAX_PICKAXE_LEVEL,       "pickaxeLevel");
  num(d.backpackLevel,  1, MAX_BACKPACK_LEVEL,       "backpackLevel");
  num(d.rebirths,       0, MAX_REBIRTHS,             "rebirths");
  num(d.prestiges,      0, MAX_PRESTIGES,            "prestiges");
  num(d.prestigeTokens, 0, MAX_PRESTIGE_TOKENS,      "prestigeTokens");

  if (!d.prestigeUpgrades || typeof d.prestigeUpgrades !== "object") {
    errors.push("prestigeUpgrades: missing or invalid");
  } else {
    for (const key of VALID_PRESTIGE_KEYS) {
      num(d.prestigeUpgrades[key], 0, MAX_PRESTIGE_UPGRADE_LEVEL, `prestigeUpgrades.${key}`);
    }
  }

  if (!VALID_DIMENSIONS.includes(d.dimension)) {
    errors.push(`dimension: invalid value "${d.dimension}"`);
  }

  if (!Array.isArray(d.dimensionUnlocked)) {
    errors.push("dimensionUnlocked: must be an array");
  } else {
    const maxUnlockable = Math.min(Math.floor((d.rebirths || 0) / 3) + 1, 9);
    if (d.dimensionUnlocked.length > maxUnlockable) {
      errors.push(`dimensionUnlocked: ${d.dimensionUnlocked.length} unlocked but only ${maxUnlockable} allowed for ${d.rebirths} rebirths`);
    }
  }

  // cashEarned must always be >= cash
  if (typeof d.cash === "number" && typeof d.cashEarned === "number" && d.cashEarned < d.cash) {
    errors.push("cashEarned cannot be less than cash");
  }

  // Stop here if basic checks failed — math checks need valid inputs
  if (errors.length > 0) return errors;

  // ── Math validation ───────────────────────────────────
  const petBonuses = computePetBonuses(d.pets || {});
  const cap        = maxCapacity(d, petBonuses);
  const power      = maxMiningPower(d, petBonuses);
  const oreVal     = maxOreValue(d, petBonuses);

  // Ore in backpack can't exceed capacity
  if (d.ore > cap) {
    errors.push(`ore: ${d.ore} exceeds max backpack capacity ${cap}`);
  }

  // Max lifetime cash: capacity * oreValue * 10,000 full sells
  const maxLifetimeCash = cap * oreVal * 10_000;
  if (d.cashEarned > maxLifetimeCash) {
    errors.push(`cashEarned: ${d.cashEarned} exceeds theoretical lifetime max ${maxLifetimeCash}`);
  }

  // Blocks mined: allow 30 days of continuous max-power mining
  const maxBlocks = power * 30 * 24 * 3600;
  if (d.blocksMined > maxBlocks) {
    errors.push(`blocksMined: ${d.blocksMined} exceeds 30-day max ${maxBlocks}`);
  }

  return errors;
}

// ============================================================
// SECTION 5 — ROUTE HANDLER
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const { userId, gameData } = req.body || {};

  if (!userId || !gameData || typeof gameData !== "object" || Array.isArray(gameData)) {
    return res.status(400).json({ success: false, message: "Missing or invalid request body." });
  }

  // ── Step 1: Verify JWT ───────────────────────────────
  const jwt = (req.headers["authorization"] || "").replace("Bearer ", "").trim();
  if (!jwt) {
    return res.status(401).json({ success: false, message: "Missing authorization header." });
  }

  let admin;
  try {
    admin = getAdminClient();
  } catch (err) {
    console.error("[save.js] Admin client error:", err.message);
    return res.status(500).json({ success: false, message: "Server configuration error." });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ success: false, message: "Could not verify user identity." });
  }

  if (userData.user.id !== userId) {
    console.warn(`[save.js] userId mismatch: body=${userId}, jwt=${userData.user.id}`);
    return res.status(403).json({ success: false, message: "User ID mismatch." });
  }

  // ── Step 2: Fetch player role + authoritative VIP status ───
  // VIP fields are NEVER trusted from the client. We always read
  // is_vip and vip_expires_at from Supabase and write them back
  // unchanged, preventing localStorage tampering with VIP expiry.
  let playerRole    = 0;
  let serverIsVip   = false;
  let serverVipExp  = 0;
  try {
    const { data: roleData } = await admin
      .from("player_saves")
      .select("role, is_vip, vip_expires_at")
      .eq("id", userId)
      .single();
    playerRole   = roleData?.role           ?? 0;
    serverIsVip  = roleData?.is_vip         ?? false;
    serverVipExp = roleData?.vip_expires_at ?? 0;

    // Auto-expire VIP server-side if the timestamp has passed
    const now = Date.now();
    if (serverIsVip && serverVipExp > 0 && serverVipExp < now) {
      serverIsVip  = false;
      serverVipExp = 0;
      // Write the expiry immediately so it's consistent in DB
      await admin
        .from("player_saves")
        .update({ is_vip: false, vip_expires_at: 0 })
        .eq("id", userId);
    }
  } catch {
    playerRole   = 0;
    serverIsVip  = false;
    serverVipExp = 0;
  }

  const isGM = playerRole === 99;

  // ── Step 3: Validate (skip for GMs) ─────────────────
  if (!isGM) {
    const errors = validateGameData(gameData);
    if (errors.length > 0) {
      console.warn(`[save.js] Validation failed for ${userId} (role=${playerRole}):`, errors);
      return res.status(422).json({
        success: false,
        message: "Save data failed validation.",
        errors,
      });
    }
  } else {
    console.log(`[save.js] GM save for ${userId} — validation skipped (role=99).`);
  }

  // ── Step 4: Write to Supabase ────────────────────────
  try {
    // Strip client-supplied VIP fields from game_data and replace
    // with the authoritative server values fetched in Step 2.
    const sanitizedData = { ...gameData, isVip: serverIsVip, vipExpiresAt: serverVipExp };

    const row = {
      id:         userId,
      nickname:   typeof gameData.nickname === "string"
        ? gameData.nickname.slice(0, 32)
        : "Player",
      game_data:  JSON.stringify(sanitizedData),
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await admin
      .from("player_saves")
      .upsert(row, { onConflict: "id" });

    if (saveError) {
      console.error("[save.js] Supabase upsert error:", saveError.message);
      return res.status(500).json({ success: false, message: "Cloud save failed. Local backup kept." });
    }

    return res.status(200).json({ success: true, message: "Game saved." });

  } catch (err) {
    console.error("[save.js] Unexpected error:", err.message);
    return res.status(500).json({ success: false, message: "Unexpected server error." });
  }
}
