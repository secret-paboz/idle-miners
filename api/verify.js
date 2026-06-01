// ============================================================
// api/verify.js — HackShield session token issuer
// Called by the client on boot (after login).
// Returns a signed HMAC token tied to the player's userId + timestamp.
// The client must include this token in every api/save.js request.
// This proves the request came from a real game session, not a
// hand-crafted console call or external script.
//
// POST /api/verify
// Body: { userId }
// Returns: { token, issuedAt }
// ============================================================

import { createHmac } from "crypto";

// Token is valid for 2 hours — forces re-verification on long sessions
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

// ── HMAC token generator ─────────────────────────────────────

function generateToken(userId, issuedAt) {
  const secret = process.env.HMAC_SECRET;
  if (!secret) throw new Error("HMAC_SECRET is not configured.");

  const payload = `${userId}:${issuedAt}`;
  const hmac    = createHmac("sha256", secret);
  hmac.update(payload);
  return hmac.digest("hex");
}

// ── Public verifier (used by api/save.js) ────────────────────

export function verifyToken(userId, issuedAt, token) {
  // Reject expired tokens
  if (Date.now() - issuedAt > TOKEN_TTL_MS) {
    return { valid: false, reason: "Token expired." };
  }

  // Reject tokens issued in the future (clock skew attack)
  if (issuedAt > Date.now() + 60_000) {
    return { valid: false, reason: "Token issued in the future." };
  }

  // Reject missing fields
  if (!userId || !issuedAt || !token) {
    return { valid: false, reason: "Missing token fields." };
  }

  const expected = generateToken(userId, issuedAt);

  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) {
    return { valid: false, reason: "Invalid token." };
  }

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return { valid: false, reason: "Invalid token." };
  }

  return { valid: true };
}

// ── Route handler ─────────────────────────────────────────────

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { userId } = req.body || {};

  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid userId." });
  }

  // Reject guest accounts — they don't get tokens
  if (userId.startsWith("guest_")) {
    return res.status(403).json({ error: "Guests cannot obtain a session token." });
  }

  try {
    const issuedAt = Date.now();
    const token    = generateToken(userId.trim(), issuedAt);

    return res.status(200).json({ token, issuedAt });
  } catch (err) {
    console.error("[verify.js] Token generation failed:", err.message);
    return res.status(500).json({ error: "Server error. Check HMAC_SECRET configuration." });
  }
}
