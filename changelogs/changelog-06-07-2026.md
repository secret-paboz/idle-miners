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

### 🚀 Boot & Session Changes

- **Game no longer loads before login** — The game loop, renders, and auto-save now only start after the player logs in or chooses to play as guest. Previously the game was fully running behind the login screen.

---

### 🐛 Bug Fixes

- **`player_id` saving as NULL on registration** — Fixed a bug where new player registrations had `player_id` as NULL in `player_saves`. The state identity (`playerId`, `nickname`, `isGuest`) is now set before the initial save snapshot is taken.

---

### 👑 VIP Changes

- **Removed offline mining perks from VIP details** — The "12h Offline Mining" and "Full Offline Cycles" perks have been removed from both the active and inactive VIP modal, as offline mining is not implemented.

---

### 🔄 Realtime Sync

- **GM actions now instant for all players** — All GM-applied changes (boosters, crates, cash, ore, shards, XP, level, pickaxe/backpack level, rebirths, prestige tokens, VIP, leaderboard visibility) are pushed via Supabase Realtime and appear on the target player's screen immediately without a reload.
- **Full panel re-render on sync** — When a realtime update arrives, the HUD, mine panel, booster badges, crates panel, and prestige panel all re-render automatically.
- **Realtime stopped on logout** — The realtime subscription is cleanly torn down when a player logs out.

---

### 🚪 Logout Changes

- **Logout now returns to login screen** — Previously logging out kept the player in-game as a guest. Now it shows the login screen, matching the expected flow.
- **Logout modal message updated** — Now reads "Your progress is saved to the cloud" instead of "You'll continue as a guest."

---

### ⚙️ Settings Panel

- **Login form removed from guest settings** — The duplicate login form in the Settings panel has been removed. Guests now see a clean info message directing them to the login screen instead.

---

> *Keep mining! ⛏️*
