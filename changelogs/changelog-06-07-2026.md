# Changelog — 07 June 2026

## 🔧 v1.0.1 — Bug Fixes & Auth Improvements

---

### 🐛 Bug Fixes

- **Register modal not appearing on login screen** — Fixed a z-index stacking issue where the register modal (z-index: 500) was being rendered behind the login screen (z-index: 900). Added a dedicated `#register-modal { z-index: 950 }` rule to `modals.css`, mirroring how the Forgot Password modal is handled.

---

### 👤 Auth Changes

- **Login now uses Player ID instead of email** — The login screen no longer asks for an email address. Players now log in with their **Player ID** and password. The email is looked up silently behind the scenes via `player_saves`.
- **Email stored in `player_saves` on registration** — The `email` field is now saved to `player_saves` at registration time to support Player ID-based login lookups.
- **Forgot Password unchanged** — The Forgot Password flow still uses email, as it needs to send a reset link.

---

### 🗒️ Notes

- Existing accounts registered before this update do not have `email` stored in `player_saves` and will need to re-register to use Player ID login.

---

> *Keep mining! ⛏️*
