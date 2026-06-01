// ============================================================
// api/env.js — Serverless env var injector
// Serves window.__ENV__ with real Supabase credentials.
// Vercel injects process.env at runtime on the server side,
// so secrets never get baked into static files.
// ============================================================

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store"); // Never cache — always fresh
  res.send(
    `window.__ENV__ = {
  SUPABASE_URL:      "${process.env.SUPABASE_URL      || ""}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ""}"
};`
  );
}
