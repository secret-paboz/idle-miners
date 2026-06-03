// ============================================================
// api/env.js — Serverless env var injector
// Serves window.__ENV__ with Supabase credentials.
// Vercel injects process.env at runtime on the server side,
// so secrets never get baked into static files.
//
// ⚠️ SECURITY RULES:
//   - SUPABASE_URL and SUPABASE_ANON_KEY are safe to expose (client needs them)
//     The anon key is a PUBLIC key — it only grants access that is explicitly
//     permitted by Supabase Row Level Security (RLS) policies. It cannot bypass
//     RLS or access other users' data. Exposing it to the browser is the
//     intended and documented Supabase pattern.
//   - SUPABASE_SERVICE_ROLE_KEY bypasses RLS entirely and must NEVER be
//     injected here. It lives exclusively in api/save.js (server-side only).
// ============================================================

export default function handler(req, res) {
  // Warn in server logs if required variables are missing
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error("[env.js] Missing required environment variables.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[env.js] WARNING: SUPABASE_SERVICE_ROLE_KEY not set. api/save.js will not work.");
  }

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store"); // Never cache — always fresh

  // Only expose what the client legitimately needs.
  // SUPABASE_SERVICE_ROLE_KEY is intentionally excluded.
  res.send(
    `window.__ENV__ = {
  SUPABASE_URL:      "${process.env.SUPABASE_URL      || ""}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ""}"
};`
  );
}
