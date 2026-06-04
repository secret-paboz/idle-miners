// ============================================================
// api/delete.js — Server-side save wipe
//
// Pipeline:
//   1. Verify JWT — confirm the request comes from a real session
//   2. Confirm userId in body matches JWT
//   3. Wipe game_data via service role key (bypasses RLS)
//
// POST /api/delete
// Headers: Authorization: Bearer <supabase_jwt>
// Body: { userId }
// Returns: { success, message }
// ============================================================

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url        = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase admin credentials not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing userId." });
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
    console.error("[delete.js] Admin client error:", err.message);
    return res.status(500).json({ success: false, message: "Server configuration error." });
  }

  // ── Step 2: Confirm identity ─────────────────────────
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ success: false, message: "Could not verify user identity." });
  }

  if (userData.user.id !== userId) {
    console.warn(`[delete.js] userId mismatch: body=${userId}, jwt=${userData.user.id}`);
    return res.status(403).json({ success: false, message: "User ID mismatch." });
  }

  // ── Step 3: Wipe game_data ───────────────────────────
  try {
    const { error } = await admin
      .from("player_saves")
      .update({ game_data: null, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("[delete.js] Supabase error:", error.message);
      return res.status(500).json({ success: false, message: "Failed to delete cloud save." });
    }

    return res.status(200).json({ success: true, message: "Cloud save deleted." });

  } catch (err) {
    console.error("[delete.js] Unexpected error:", err.message);
    return res.status(500).json({ success: false, message: "Unexpected server error." });
  }
}
