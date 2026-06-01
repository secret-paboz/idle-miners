// ============================================================
// api/save.js — Server-side save validator
//
// Replaces the old HackShield token system.
// No tokens, no fragile client state.
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
// POST /api/save
// Headers: Authorization: Bearer <supabase_jwt>
// Body: { userId, gameData }
// Returns: { success, message }
// ============================================================

import { createClient } from "@supabase/supabase-js";

// ── Admin client (service role — never exposed to client) ───
function getAdminClient() {
  const url        = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase admin credentials not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// ============================================================
// SECTION 1 — GAME CONSTANTS (mirrors client-side data files)
// These must stay in sync with:
//   js/data/mines-data.js
//   js/data/dimensions-data.js
//   js/data/pets-data.js
// ============================================================

// Highest ore base value in the game (ancientDebris = 5000)
const MAX_ORE_BASE_VALUE = 5000;

// Highest dimension multiplier (aether = 150x)
const MAX_DIMENSION_MULTI = 150.0;

// Max pickaxe / backpack levels
const MAX_PICKAXE_LEVEL  = 200;
const MAX_BACKPACK_LEVEL = 200;

// Max prestige upgrade levels (generous cap)
const MAX_PRESTIGE_UPGRADE_LEVEL = 20;

// Max rebirths / prestiges (extremely generous)
const MAX_REBIRTHS  = 999;
const MAX_PRESTIGES = 999;
const MAX_PRESTIGE_TOKENS = 999;

// Max XP level
const MAX_LEVEL = 10000;

// Valid dimension IDs
const VALID_DIMENSIONS = [
  "earth", "cave", "snow", "nether",
  "crimson", "warped", "end", "void", "aether"
];

// Valid prestige upgrade keys
const VALID_PRESTIGE_KEYS = [
  "merchantLevel", "greedLevel", "speedLevel", "storageLevel"
];

// Max pet modifier per level per pet (guardian rare = 0.15, legendary = 0.20)
// Summed across all pets owned — generous cap
const MAX_PET_SELL_BONUS    = 20.0;  // 20x max sell bonus from pets
const MAX_PET_MINING_BONUS  = 20.0;  // 20x max mining bonus from pets
const MAX_PET_BACKPACK_BONUS = 20.0; // 20x max backpack bonus from pets

// Max booster multiplier from crates
const MAX_BOOSTER_MULTI = 10.0;

// Legendary ability buffs: 2x (rage = mining, wings = sell)
const ABILITY_BUFF_MULTI = 2.0;

// VIP bonus: 2x sell value
const VIP_SELL_MULTI = 2.0;

// Offline cap: 12 hours max (VIP), generously use 12h for all
const MAX_OFFLINE_SECONDS = 12 * 60 * 60;

// ============================================================
// SECTION 2 — MATH VALIDATION
// Recalculates the theoretical MAXIMUM possible values given
// the player's own submitted stats. If their submitted values
// exceed the theoretical max (with generous buffers), reject.
// ============================================================

function computeTheoreticalMaxMiningPower(d) {
  // Base: pickaxeLevel + speedPrestige
  const speedPrestige = Math.min(d.prestigeUpgrades?.speedLevel || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const base          = Math.min(d.pickaxeLevel, MAX_PICKAXE_LEVEL) + speedPrestige;

  // Pet bonus (uncommon pets boost mining)
  const petBonus = Math.min(d._petMiningBonus || 0, MAX_PET_MINING_BONUS);

  // Apply pet bonus
  let power = base * (1 + petBonus);

  // Rage buff: 2x
  power *= ABILITY_BUFF_MULTI;

  // Speed booster from crates: up to MAX_BOOSTER_MULTI
  power *= MAX_BOOSTER_MULTI;

  return Math.ceil(power);
}

function computeTheoreticalMaxCapacity(d) {
  const storagePrestige = Math.min(d.prestigeUpgrades?.storageLevel || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const base            = 20 + (Math.min(d.backpackLevel, MAX_BACKPACK_LEVEL) * 15);
  const petBonus        = Math.min(d._petBackpackBonus || 0, MAX_PET_BACKPACK_BONUS);
  return Math.ceil((base * (1 + petBonus)) + (storagePrestige * 10));
}

function computeTheoreticalMaxOreValue(d) {
  const rebirths    = Math.min(d.rebirths || 0, MAX_REBIRTHS);
  const greedLevel  = Math.min(d.prestigeUpgrades?.greedLevel || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const merchantLvl = Math.min(d.prestigeUpgrades?.merchantLevel || 0, MAX_PRESTIGE_UPGRADE_LEVEL);
  const petBonus    = Math.min(d._petSellBonus || 0, MAX_PET_SELL_BONUS);

  const rebirthMod  = 1 + (rebirths * 0.10);
  const greedMod    = 1 + (greedLevel * 0.02);
  const merchantMod = 1 + (merchantLvl * 0.05);

  let value = MAX_ORE_BASE_VALUE
    * MAX_DIMENSION_MULTI
    * rebirthMod
    * greedMod
    * merchantMod
    * (1 + petBonus);

  // Wings buff: 2x
  value *= ABILITY_BUFF_MULTI;

  // Sell booster: up to MAX_BOOSTER_MULTI
  value *= MAX_BOOSTER_MULTI;

  // VIP: 2x
  value *= VIP_SELL_MULTI;

  return Math.ceil(value);
}

// Compute pet bonuses from the submitted pets object
// Returns { miningBonus, backpackBonus, sellBonus }
function computePetBonuses(pets) {
  if (!pets || typeof pets !== "object") return { miningBonus: 0, backpackBonus: 0, sellBonus: 0 };

  const RARITY_EFFECT = {
    common:    "backpack",
    uncommon:  "mining",
    rare:      "sell",
    legendary: null,
  };

  // Pet modifier caps per rarity (from pets-data.js)
  const PET_MODIFIERS = {
    chicken:    { rarity: "common",    modifier: 0.05, maxLevel: 50 },
    cow:        { rarity: "common",    modifier: 0.06, maxLevel: 50 },
    pig:        { rarity: "common",    modifier: 0.06, maxLevel: 50 },
    sheep:      { rarity: "common",    modifier: 0.07, maxLevel: 50 },
    creeper:    { rarity: "uncommon",  modifier: 0.08, maxLevel: 50 },
    zombie:     { rarity: "uncommon",  modifier: 0.08, maxLevel: 50 },
    skeleton:   { rarity: "uncommon",  modifier: 0.09, maxLevel: 50 },
    spider:     { rarity: "uncommon",  modifier: 0.10, maxLevel: 50 },
    blaze:      { rarity: "rare",      modifier: 0.12, maxLevel: 40 },
    enderman:   { rarity: "rare",      modifier: 0.13, maxLevel: 40 },
    guardian:   { rarity: "rare",      modifier: 0.15, maxLevel: 40 },
    wither:     { rarity: "legendary", modifier: 0.20, maxLevel: 30 },
    enderdragon:{ rarity: "legendary", modifier: 0.20, maxLevel: 30 },
  };

  let miningBonus = 0, backpackBonus = 0, sellBonus = 0;

  for (const [petId, petState] of Object.entries(pets)) {
    if (!petState?.owned) continue;

    const petDef = PET_MODIFIERS[petId];
    if (!petDef) continue;

    // Cap pet level to its max
    const level = Math.min(petState.level || 1, petDef.maxLevel);
    const bonus = petDef.modifier * level;
    const effect = RARITY_EFFECT[petDef.rarity];

    if (effect === "backpack") backpackBonus += bonus;
    if (effect === "mining")   miningBonus   += bonus;
    if (effect === "sell")     sellBonus     += bonus;
  }

  return { miningBonus, backpackBonus, sellBonus };
}

// Main validation function
// Returns array of error strings — empty = valid
function validateGameData(d) {
  const errors = [];

  // ── Type guards ────────────────────────────────────────
  function num(val, min, max, label) {
    if (typeof val !== "number" || !isFinite(val) || val < min || val > max) {
      errors.push(`${label}: expected number between ${min} and ${max}, got ${val}`);
      return false;
    }
    return true;
  }

  // ── Basic field checks ────────────────────────────────
  num(d.cash,         0, Number.MAX_SAFE_INTEGER, "cash");
  num(d.cashEarned,   0, Number.MAX_SAFE_INTEGER, "cashEarned");
  num(d.shards,       0, Number.MAX_SAFE_INTEGER, "shards");
  num(d.ore,          0, Number.MAX_SAFE_INTEGER, "ore");
  num(d.level,        1, MAX_LEVEL,               "level");
  num(d.xp,           0, Number.MAX_SAFE_INTEGER, "xp");
  num(d.blocksMined,  0, Number.MAX_SAFE_INTEGER, "blocksMined");
  num(d.pickaxeLevel, 1, MAX_PICKAXE_LEVEL,       "pickaxeLevel");
  num(d.backpackLevel,1, MAX_BACKPACK_LEVEL,       "backpackLevel");
  num(d.rebirths,     0, MAX_REBIRTHS,            "rebirths");
  num(d.prestiges,    0, MAX_PRESTIGES,           "prestiges");
  num(d.prestigeTokens, 0, MAX_PRESTIGE_TOKENS,  "prestigeTokens");

  // ── Prestige upgrades ─────────────────────────────────
  if (!d.prestigeUpgrades || typeof d.prestigeUpgrades !== "object") {
    errors.push("prestigeUpgrades: missing or invalid");
  } else {
    for (const key of VALID_PRESTIGE_KEYS) {
      num(d.prestigeUpgrades[key], 0, MAX_PRESTIGE_UPGRADE_LEVEL, `prestigeUpgrades.${key}`);
    }
  }

  // ── Dimension checks ──────────────────────────────────
  if (!VALID_DIMENSIONS.includes(d.dimension)) {
    errors.push(`dimension: invalid value "${d.dimension}"`);
  }
  if (!Array.isArray(d.dimensionUnlocked)) {
    errors.push("dimensionUnlocked: must be an array");
  } else {
    const maxUnlockable = Math.min(Math.floor((d.rebirths || 0) / 3) + 1, 9);
    if (d.dimensionUnlocked.length > maxUnlockable) {
      errors.push(`dimensionUnlocked: too many unlocked (${d.dimensionUnlocked.length}) for ${d.rebirths} rebirths (max ${maxUnlockable})`);
    }
  }

  // ── cashEarned must be >= cash ─────────────────────────
  if (typeof d.cash === "number" && typeof d.cashEarned === "number") {
    if (d.cashEarned < d.cash) {
      errors.push("cashEarned cannot be less than cash");
    }
  }

  // ── Math validation — stop here if basic checks failed ─
  if (errors.length > 0) return errors;

  // ── Compute pet bonuses from submitted pets ────────────
  const petBonuses = computePetBonuses(d.pets || {});
  d._petMiningBonus   = petBonuses.miningBonus;
  d._petBackpackBonus = petBonuses.backpackBonus;
  d._petSellBonus     = petBonuses.sellBonus;

  // ── Theoretical max ore per save interval ─────────────
  // Max possible ore = maxPower * MAX_OFFLINE_SECONDS
  // (covers both online play + max offline cap)
  const maxPower    = computeTheoreticalMaxMiningPower(d);
  const maxCapacity = computeTheoreticalMaxCapacity(d);

  // Ore in backpack can't exceed backpack capacity
  if (d.ore > maxCapacity) {
    errors.push(`ore: ${d.ore} exceeds max backpack capacity ${maxCapacity}`);
  }

  // ── Theoretical max cash from a single full backpack sell ─
  // Most cash = maxCapacity * maxOreValue
  // We allow up to 10,000 full sells worth of cash (extremely generous lifetime cap)
  const maxOreValue   = computeTheoreticalMaxOreValue(d);
  const maxSingleSell = maxCapacity * maxOreValue;
  const maxLifetimeCash = maxSingleSell * 10_000; // 10,000 full backpack sells lifetime

  if (d.cashEarned > maxLifetimeCash) {
    errors.push(`cashEarned: ${d.cashEarned} exceeds theoretical max ${maxLifetimeCash}`);
  }

  // cash on hand can never exceed cashEarned
  if (d.cash > d.cashEarned) {
    errors.push(`cash: ${d.cash} exceeds cashEarned ${d.cashEarned}`);
  }

  // ── Blocks mined: must be plausible vs time played ────
  // Max blocks = maxPower * MAX_OFFLINE_SECONDS * (generous sessions multiplier)
  // We allow 30 days worth of continuous max-power mining (very generous)
  const maxBlocksLifetime = maxPower * 30 * 24 * 3600;
  if (d.blocksMined > maxBlocksLifetime) {
    errors.push(`blocksMined: ${d.blocksMined} exceeds theoretical max ${maxBlocksLifetime}`);
  }

  // ── Shards: cap at a generous but finite amount ────────
  // Max shards from fishing (10 per 30min) = 10 * 48 * 30 * 24 = 345,600 per 30 days
  // Plus hunt shards. Use generous cap.
  const MAX_SHARDS = 1_000_000;
  if (d.shards > MAX_SHARDS) {
    errors.push(`shards: ${d.shards} exceeds maximum ${MAX_SHARDS}`);
  }

  return errors;
}

// ============================================================
// SECTION 3 — ROUTE HANDLER
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const { userId, gameData } = req.body || {};

  // ── Step 1: Basic field presence ─────────────────────
  if (!userId || !gameData || typeof gameData !== "object") {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  // ── Step 2: Verify JWT ───────────────────────────────
  const authHeader = req.headers["authorization"] || "";
  const jwt        = authHeader.replace("Bearer ", "").trim();

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

  // Confirm JWT belongs to a real user
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ success: false, message: "Could not verify user identity." });
  }

  // Confirm userId in body matches JWT owner
  if (userData.user.id !== userId) {
    console.warn(`[save.js] userId mismatch: body=${userId}, jwt=${userData.user.id}`);
    return res.status(403).json({ success: false, message: "User ID mismatch." });
  }

  // ── Step 3: Fetch player role from Supabase ──────────
  let playerRole = 0;
  try {
    const { data: roleData, error: roleError } = await admin
      .from("player_saves")
      .select("role")
      .eq("id", userId)
      .single();

    if (!roleError && roleData) {
      playerRole = roleData.role ?? 0;
    }
  } catch (err) {
    console.warn("[save.js] Could not fetch player role:", err.message);
    // Default to 0 — non-GM — if role fetch fails
    playerRole = 0;
  }

  const isGM = playerRole === 99;

  // ── Step 4: Validate game data (skip for GMs) ───────
  if (!isGM) {
    const errors = validateGameData(gameData);
    if (errors.length > 0) {
      console.warn(`[save.js] Validation failed for ${userId}:`, errors);
      return res.status(422).json({
        success: false,
        message: "Save data failed validation.",
        errors,
      });
    }
  } else {
    console.log(`[save.js] GM save bypass for ${userId} (role=99).`);
  }

  // ── Step 5: Write to Supabase ────────────────────────
  try {
    // Strip internal validation helper keys before saving
    const cleanData = { ...gameData };
    delete cleanData._petMiningBonus;
    delete cleanData._petBackpackBonus;
    delete cleanData._petSellBonus;

    const row = {
      id:         userId,
      nickname:   typeof cleanData.nickname === "string"
        ? cleanData.nickname.slice(0, 32)
        : "Player",
      game_data:  JSON.stringify(cleanData),
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
