// ============================================================
// api/save.js — HackShield save validator
// All cloud saves for logged-in players must go through here.
// Never called by guests — they use localStorage only.
//
// POST /api/save
// Headers: Content-Type: application/json
// Body: { userId, token, issuedAt, gameData }
// Returns: { success, message }
//
// Pipeline:
//   1. Verify session token (from api/verify.js)
//   2. Verify caller owns the userId (Supabase JWT check)
//   3. Sanity-check the submitted game data
//   4. Write to Supabase using the service_role key (bypasses RLS)
// ============================================================

import { createClient }  from "@supabase/supabase-js";
import { verifyToken }   from "./verify.js";

// ── Supabase admin client (service role — never exposed to client) ──
function getAdminClient() {
  const url        = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin credentials not configured.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ============================================================
// SECTION 1 — SANITY CHECKS
// Validates that submitted game data is mathematically plausible.
// Not exhaustive — just catches obvious cheated values.
// ============================================================

const MAX_PICKAXE_LEVEL  = 200;
const MAX_BACKPACK_LEVEL = 200;
const MAX_REBIRTHS       = 999;   // Extremely generous upper bound
const MAX_PRESTIGES      = 999;
const MAX_PRESTIGE_TOKENS = 999;
const MAX_PRESTIGE_UPGRADE_LEVEL = 20;
const MAX_LEVEL          = 10000; // XP level cap (generous)
const MAX_DIMENSION_IDX  = 8;     // 0–8, 9 dimensions total

const VALID_DIMENSIONS = [
  "earth", "cave", "snow", "nether",
  "crimson", "warped", "end", "void", "aether"
];

const VALID_PRESTIGE_KEYS = [
  "merchantLevel", "greedLevel", "speedLevel", "storageLevel"
];

function sanitizeNumber(val, min, max) {
  if (typeof val !== "number" || !isFinite(val)) return false;
  if (val < min || val > max) return false;
  return true;
}

function sanityCheck(data) {
  const errors = [];

  // ── Core currencies ─────────────────────────────────────
  if (!sanitizeNumber(data.cash, 0, Number.MAX_SAFE_INTEGER))
    errors.push("cash out of range");
  if (!sanitizeNumber(data.cashEarned, 0, Number.MAX_SAFE_INTEGER))
    errors.push("cashEarned out of range");
  if (!sanitizeNumber(data.shards, 0, Number.MAX_SAFE_INTEGER))
    errors.push("shards out of range");
  if (!sanitizeNumber(data.ore, 0, Number.MAX_SAFE_INTEGER))
    errors.push("ore out of range");

  // ── Progression ─────────────────────────────────────────
  if (!sanitizeNumber(data.level, 1, MAX_LEVEL))
    errors.push("level out of range");
  if (!sanitizeNumber(data.xp, 0, Number.MAX_SAFE_INTEGER))
    errors.push("xp out of range");
  if (!sanitizeNumber(data.blocksMined, 0, Number.MAX_SAFE_INTEGER))
    errors.push("blocksMined out of range");

  // ── Equipment ───────────────────────────────────────────
  if (!sanitizeNumber(data.pickaxeLevel, 1, MAX_PICKAXE_LEVEL))
    errors.push(`pickaxeLevel out of range (max ${MAX_PICKAXE_LEVEL})`);
  if (!sanitizeNumber(data.backpackLevel, 1, MAX_BACKPACK_LEVEL))
    errors.push(`backpackLevel out of range (max ${MAX_BACKPACK_LEVEL})`);

  // ── Prestige progression ─────────────────────────────────
  if (!sanitizeNumber(data.rebirths, 0, MAX_REBIRTHS))
    errors.push("rebirths out of range");
  if (!sanitizeNumber(data.prestiges, 0, MAX_PRESTIGES))
    errors.push("prestiges out of range");
  if (!sanitizeNumber(data.prestigeTokens, 0, MAX_PRESTIGE_TOKENS))
    errors.push("prestigeTokens out of range");

  // ── Prestige upgrades ────────────────────────────────────
  if (data.prestigeUpgrades && typeof data.prestigeUpgrades === "object") {
    for (const key of VALID_PRESTIGE_KEYS) {
      const val = data.prestigeUpgrades[key];
      if (!sanitizeNumber(val, 0, MAX_PRESTIGE_UPGRADE_LEVEL)) {
        errors.push(`prestigeUpgrades.${key} out of range`);
      }
    }
  } else {
    errors.push("prestigeUpgrades missing or invalid");
  }

  // ── Dimension ───────────────────────────────────────────
  if (!VALID_DIMENSIONS.includes(data.dimension))
    errors.push("invalid dimension");

  if (!Array.isArray(data.dimensionUnlocked))
    errors.push("dimensionUnlocked is not an array");

  // ── Logical consistency checks ───────────────────────────
  // Can't have more dimensions unlocked than rebirths allow
  const maxUnlockable = Math.min(Math.floor(data.rebirths / 3) + 1, 9);
  if (Array.isArray(data.dimensionUnlocked) && data.dimensionUnlocked.length > maxUnlockable) {
    errors.push(`too many dimensions unlocked for rebirth count (${data.rebirths} rebirths allows ${maxUnlockable})`);
  }

  // Cash can't wildly exceed what's theoretically earnable
  // Very generous: allow up to 1e18 (formatNumber supports up to Qi)
  if (data.cash > 1e18) errors.push("cash exceeds maximum");
  if (data.cashEarned > 1e18) errors.push("cashEarned exceeds maximum");

  return errors;
}

// ============================================================
// SECTION 2 — ROUTE HANDLER
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const { userId, token, issuedAt, gameData } = req.body || {};

  // ── Step 1: Basic field validation ──────────────────────
  if (!userId || !token || !issuedAt || !gameData) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  if (typeof gameData !== "object" || Array.isArray(gameData)) {
    return res.status(400).json({ success: false, message: "Invalid gameData format." });
  }

  // ── Step 2: Verify HMAC session token ───────────────────
  const tokenResult = verifyToken(userId, issuedAt, token);
  if (!tokenResult.valid) {
    console.warn(`[save.js] Token rejected for ${userId}: ${tokenResult.reason}`);
    return res.status(401).json({ success: false, message: "Invalid or expired session. Please reload the game." });
  }

  // ── Step 3: Verify userId matches Supabase session ──────
  // Extract the bearer token from the Authorization header
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

  // Validate the JWT by fetching the user it belongs to
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ success: false, message: "Could not verify user identity." });
  }

  // Confirm the userId in the body matches the JWT owner
  if (userData.user.id !== userId) {
    console.warn(`[save.js] userId mismatch: body=${userId}, jwt=${userData.user.id}`);
    return res.status(403).json({ success: false, message: "User ID mismatch." });
  }

  // ── Step 4: Sanity check game data ──────────────────────
  const errors = sanityCheck(gameData);
  if (errors.length > 0) {
    console.warn(`[save.js] Sanity check failed for ${userId}:`, errors);
    return res.status(422).json({
      success: false,
      message: "Save data failed validation.",
      errors,   // Returned so the client can log it — not shown to the user
    });
  }

  // ── Step 5: Write to Supabase via service role ──────────
  try {
    const row = {
      id:         userId,
      nickname:   typeof gameData.nickname === "string" ? gameData.nickname.slice(0, 32) : "Player",
      game_data:  JSON.stringify(gameData),
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
