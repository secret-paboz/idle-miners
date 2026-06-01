# ⛏️ Idle Miners

A browser-based idle mining game inspired by the Discord Idle Miner bot. Mine ore, upgrade your gear, collect pets, open crates, and prestige your way through 9 dimensions.

**Live site:** https://idle-miners.vercel.app

---

## 🎮 How to Play

1. Ore is mined automatically every second based on your **Mining Power**
2. **Sell** your backpack to earn cash
3. Spend cash on **Pickaxe** and **Backpack** upgrades
4. Reach level 200 in both to **Rebirth** — resetting progress but earning a permanent +10% sell bonus
5. After 25 Rebirths, unlock **Prestige** for tokens to spend in the shop

---

## ✨ Features

<details>
<summary><strong>⚒️ Mining & Progression</strong></summary>

- Ore mines automatically every second
- 13 ore types from Dirt → Ancient Debris, each with higher base value
- 13 mine tiers unlock as you level up (Surface Mine → Ancient Ruins)
- Pickaxe and Backpack upgrades scale with a 1.15x cost curve
- XP and levelling system — higher level = better ore tiers
- Offline progress calculated on return (capped at 8h for regular players, 12h for VIP)

</details>

<details>
<summary><strong>🌍 Dimensions (9 total)</strong></summary>

Unlock a new dimension every 3 Rebirths. Each one multiplies all ore value.

| Dimension | Rebirths Needed | Value Multiplier |
|---|---|---|
| Earth | 0 | 1x |
| Deep Cave | 3 | 2.5x |
| Snow | 6 | 5x |
| Nether | 9 | 10x |
| Crimson Forest | 12 | 18x |
| Warped Forest | 15 | 30x |
| The End | 18 | 50x |
| The Void | 21 | 80x |
| The Aether | 24 | 150x |

</details>

<details>
<summary><strong>🐾 Pets (13 total)</strong></summary>

Hunt and Fish to find pets. Each rarity buffs a different stat.

| Rarity | Effect | Pets |
|---|---|---|
| Common | +Backpack capacity | Chicken, Cow, Pig, Sheep |
| Uncommon | +Mining speed | Creeper, Zombie, Skeleton, Spider |
| Rare | +Sell value | Blaze, Enderman, Guardian |
| Legendary | Special ability | Wither (Rage — 2x mining for 60s), Ender Dragon (Wings — 2x sell for 60s) |

Pets are upgraded with Shards and have a max level cap per rarity.

</details>

<details>
<summary><strong>🎁 Crates & Boosters</strong></summary>

Crates award temporary boosters for Mining Speed, Sell Value, or XP Gain.

- **Hourly Crate** — awarded every hour automatically
- **Daily Crate** — awarded every 24 hours
- **Weekly Crate** — awarded every 7 days
- **Common / Rare / Legendary Crates** — dropped from pets and prestige rewards

Active boosters appear as badges in the Mine panel with a live countdown timer.

</details>

<details>
<summary><strong>♻️ Rebirth & 🏆 Prestige</strong></summary>

**Rebirth** — requires Pickaxe Lv.200 + Backpack Lv.200
- Resets: cash, ore, level, gear
- Keeps: pets, shards, crates, dimensions
- Reward: permanent +10% sell value per rebirth

**Prestige** — requires 25 Rebirths + Pickaxe Lv.200 + Backpack Lv.200
- Resets everything including rebirths
- Reward: 1 Prestige Token for the shop

**Prestige Shop upgrades:**

| Upgrade | Effect per level | Max level |
|---|---|---|
| Merchant | +5% sell cash | 20 |
| Greed | +2% ore value | 20 |
| Overdrive | +1 base mining speed | 20 |
| Expansion | +10 backpack capacity | 20 |

</details>

<details>
<summary><strong>👑 VIP</strong></summary>

VIP is granted by a Game Master and lasts for a set number of days. VIP players receive:

- **2× Sell Value** on all ore
- **Auto-Sell** when backpack hits 100% capacity
- **12h offline mining** (vs 8h for regular players)
- A pulsating gold **👑 VIP** badge next to their nickname in the HUD
- A pulsating gold **👑 VIP** badge next to their nickname in the leaderboard
- Their nickname colored by their current dimension in all views
- An animated gold glow ring on the VIP card in Settings

VIP status is stored server-side in Supabase and expires automatically. Players without VIP see no badge and receive no perks.

> To grant VIP, use the GM Panel → VIP Management section (Game Masters only).

</details>

<details>
<summary><strong>☁️ Accounts & Cloud Saves</strong></summary>

- Play as **Guest** — progress saved to localStorage only
- **Register** an account to enable cloud saves via Supabase
- On login, cloud and local saves are compared — the newer one wins
- **Auto-save** runs every 60 seconds for logged-in players
- **Logout** fully wipes local data — the cloud copy is always the source of truth

> Guests cannot cloud save or appear on the leaderboard.

</details>

<details>
<summary><strong>🏅 Leaderboard</strong></summary>

Global leaderboard for logged-in players across 4 categories:

- Most Rebirths
- Blocks Mined
- Cash Earned
- Pets Owned

Each player's nickname is colored by their current **dimension color**. VIP players are marked with a pulsing **👑 VIP** badge. Hidden players are completely invisible to all viewers — enforced server-side via Supabase RLS, not clientside filtering.

</details>

---

## 🛡️ Game Master (GM) Panel

GMs have access to a hidden panel in the Settings tab for server-side management.

**GM status is never stored client-side.** It is verified at runtime by reading the `role` column from Supabase — role `99` = Game Master. This prevents any client-side manipulation.

**Available GM actions:**

| Action | Description |
|---|---|
| Set Cash / Shards / Ore | Override any resource value |
| Set Level / XP | Jump to any level |
| Set Pickaxe / Backpack level | Override gear levels |
| Set Rebirths / Prestige Tokens | Override progression milestones |
| Set Total Cash Earned | Override leaderboard stat |
| Leaderboard visibility toggle | Hide/show GM account — enforced serverside via Supabase |
| Grant VIP | Give VIP to any player by Player ID for N days |
| Revoke VIP | Remove VIP from any player immediately |
| Check VIP | Look up current VIP status for any player |

**To promote a player to GM:**
> Supabase dashboard → Table Editor → `player_saves` → find their row → set `role = 99` → save

---

## 🗂️ Project Structure

```
idle-miners/
├── index.html              # App shell + tab layout
├── vercel.json             # Routing config
├── api/
│   └── env.js              # Serverless env var injector (keeps keys out of client bundle)
├── css/
│   ├── variables.css       # Design tokens, CSS reset, base elements, dimension themes
│   ├── layout.css          # App shell, HUD, content area, tab bar, safe area
│   ├── components.css      # Cards, progress bars, buttons, shared animations
│   ├── panels.css          # Mine, Pets, Crates, Prestige panel styles
│   ├── modals.css          # Toast, confirm modal, leaderboard modal, floating FAB
│   └── settings.css        # Auth forms, settings panel, GM panel, VIP system
└── js/
    ├── main.js             # Entry point, game loop, event binding
    ├── state.js            # Global game state + localStorage save/load
    ├── economy.js          # All game math (mining, selling, upgrades)
    ├── auth.js             # Login, register, logout, guest mode
    ├── supabase.js         # Cloud save + auto-save (60s interval)
    ├── gm.js               # Game Master role check + GM actions
    ├── pets.js             # Hunt, fish, pet abilities
    ├── crates.js           # Crate opening + booster logic
    ├── prestige.js         # Rebirth/prestige gates + shop
    ├── leaderboard.js      # Fetch + submit leaderboard scores
    ├── ui/
    │   ├── ui-core.js      # Shared helpers, tab navigation, toast, modal
    │   ├── ui-hud.js       # Top HUD bar renderer
    │   ├── ui-mine.js      # Mine panel + mining animations
    │   ├── ui-pets.js      # Pets panel renderer
    │   ├── ui-crates.js    # Crates panel + crate open animation
    │   ├── ui-prestige.js  # Prestige panel renderer
    │   └── ui-settings.js  # Settings, leaderboard, register modal, GM panel
    └── data/
        ├── mines-data.js       # Ore types + mine tiers
        ├── dimensions-data.js  # Dimension unlocks + multipliers
        └── pets-data.js        # Pet definitions + rarity config
```

---

## 🚀 Deployment (Vercel)

<details>
<summary><strong>Setup steps</strong></summary>

1. Fork or clone this repo
2. Connect it to [Vercel](https://vercel.com)
3. Add these **Environment Variables** in your Vercel project settings:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API |

4. Deploy — Vercel serves `api/env.js` as a serverless function that injects the env vars at runtime, keeping them out of your client-side bundle.

> **Note:** Static placeholder patterns like `%%SUPABASE_URL%%` do NOT work on Vercel. The `api/env.js` serverless approach is required.

</details>

---

## 🛠️ Local Development

No build step required. ES modules need a local server — opening `index.html` directly in a browser will not work.

```bash
# Python
python3 -m http.server 3000

# Node (npx)
npx serve .
```

For local Supabase credentials, paste them temporarily into `js/supabase.js` for testing, or set up a local `.env` loader.

---

## 📋 Changelog

<details>
<summary><strong>v1.5.0 — Bug Fixes, UX Polish & Stability</strong></summary>

### 🐛 Fix: Dimension icons not displaying
- `renderDimensionSelector()` in `ui-mine.js` was only outputting the dimension name — the `icon` field in `dimensions-data.js` was defined but never rendered.
- Fixed by adding `<i class="${dim.icon}">` to each dimension button in the selector.
- Also fixed: `fa-earth-americas` (Font Awesome Pro) was used for the Earth dimension icon, causing it to silently fail in free tier projects. Replaced with `fa-globe` (Font Awesome 6 Free).

**Files changed:** `js/data/dimensions-data.js` · `js/ui/ui-mine.js`

---

### ✨ Improvement: VIP badge shimmer animation
- Replaced the pulsing gold glow (`vipPulse`) on all VIP badges with a diagonal shimmer sweep — a bright light streak that slides across the badge on a 2.8s loop.
- Applies to: HUD badge, leaderboard badge, booster panel badge.
- The VIP status card's existing `vipCardPulse` ring animation is intentionally untouched.

**Files changed:** `css/settings.css`

---

### ✨ Improvement: Live ore bar updates
- `renderMinePanel()` was previously only called on explicit user actions (sell, upgrade, tab switch). The ore bar, stats grid, and upgrade button affordability could appear stale between interactions.
- Added `renderMinePanel()` to the game loop (`RENDER_MINE_EVERY = 2` ticks) so the panel refreshes every 2 seconds automatically.

**Files changed:** `js/main.js`

---

### 🐛 Fix: Ore type mismatch on sell toast
- `sellOre()` was calling `rollOre()` to determine the ore type shown in the sell toast — a fresh random roll that had no relation to what was actually mined into the backpack.
- Fixed by adding `currentOreId` to game state, updated by `tickMining()` on every tick.
- `sellOre()` now reads `state.currentOreId` directly, so the ore type in the toast always matches what was sold.
- `renderMineStats()` also updated to use `state.currentOreId` instead of computing the most-weighted ore from the tier table.

**Files changed:** `js/state.js` · `js/economy.js` · `js/ui/ui-mine.js`

---

### 🛡️ Fix: Offline progress guard against corrupted timestamps
- `calculateOfflineProgress()` previously only checked `if (!state.lastOnlineTime)` before computing elapsed time. A corrupted, negative, or clock-skewed timestamp could produce an astronomically large elapsed value, flooding the player with fake offline ore on load.
- Added a validation guard that rejects elapsed times that are: non-finite, zero or negative, or greater than 30 days. Any of these conditions returns `null` immediately.

**Files changed:** `js/economy.js`

---

### ✨ Improvement: Boot loading spinner
- During `boot()`, the game was silently awaiting Supabase session restore and cloud load with no visual feedback. On slow connections this appeared as a blank or broken screen.
- Added a full-screen spinner overlay that displays while the game initialises. Shows `"Starting up..."` on first load, switching to `"Loading save..."` when a cloud load is in progress. Fades out smoothly once the game is ready.
- `showBootSpinner()` and `hideBootSpinner()` added to `ui-core.js`. Spinner styles added to `components.css`.

**Files changed:** `js/main.js` · `js/ui/ui-core.js` · `css/components.css`

</details>

<details>
<summary><strong>v1.4.0 — CSS Refactor: Modular Stylesheet Architecture</strong></summary>

### 🎨 Refactor: style.css split into 6 focused files under css/

The monolithic `style.css` (1,892 lines) has been replaced with six dedicated stylesheets housed in a new `css/` directory. Each file owns a single layer of the UI, making future edits faster to locate and safer to change without side effects.

**New file structure under `css/`:**

| File | Responsibility |
|---|---|
| `variables.css` | All `:root` design tokens (colors, spacing, radius, transitions, layout heights), CSS reset, base element styles (`button`, `input`, `img`, `a`), dimension body themes, rarity color tokens |
| `layout.css` | App shell (`#app`), HUD (sticky top bar, stat cells, nickname, XP bar), main scrollable content area + custom scrollbar, panel show/hide + fade animation, tab bar (fixed bottom nav), iPhone safe area support |
| `components.css` | Shared reusable pieces: `.card`, `.card-title`, `.progress-bar`, `.progress-fill`, `.btn-primary`, `.btn-ghost`, floating text animations, `.flash` and `.cash-flash` animations |
| `panels.css` | Mine panel (ore bar, stats grid, sell button, upgrade buttons, dimension selector, booster badges), Pets panel (hunt/fish buttons, pet grid, rarity badges, upgrade & ability buttons), Crates panel (timed timers, inventory cards), Prestige panel (rebirth/prestige buttons, prestige shop) |
| `modals.css` | Toast notifications, confirm modal overlay, floating leaderboard FAB with pulse animation, leaderboard bottom-sheet modal (tabs, header row, player rows, VIP nickname support) |
| `settings.css` | Settings panel layout, auth forms (login, register modal), VIP badge variants (HUD, leaderboard, status card with animated glow ring), GM panel (stat overrides grid, VIP management buttons) |

### ✨ Improvement: Mobile touch feedback
- Added `button:active { transform: scale(0.96) }` in `variables.css` — all buttons now give immediate tactile visual feedback on Android tap, making the game feel more responsive without any JS changes.

### 🔗 index.html update required
Replace the single stylesheet link with the new imports in this order:

```html
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/panels.css">
<link rel="stylesheet" href="css/modals.css">
<link rel="stylesheet" href="css/settings.css">
```

Then delete `style.css`.

### Files changed
`css/variables.css` *(new)* · `css/layout.css` *(new)* · `css/components.css` *(new)* · `css/panels.css` *(new)* · `css/modals.css` *(new)* · `css/settings.css` *(new)* · `index.html` · ~~`style.css`~~ *(deleted)*

</details>

<details>
<summary><strong>v1.3.0 — UI Refactor: Modular Architecture</strong></summary>

### 🏗️ Refactor: ui.js split into dedicated modules
- The monolithic `ui.js` (35,000 bytes, 950+ lines) has been replaced with seven focused modules housed in a new `js/ui/` directory.
- Each module owns a single panel or responsibility, making future changes easier to locate, test, and review in isolation.

**New file structure under `js/ui/`:**

| File | Responsibility |
|---|---|
| `ui-core.js` | Shared DOM helpers, tab navigation, toast queue, modal, offline progress popup |
| `ui-hud.js` | Top HUD bar (nickname, VIP badge, cash, shards, level, XP bar, dimension label) |
| `ui-mine.js` | Mine panel, ore bar, dimension selector, booster badges, upgrade buttons, tick & sell animations |
| `ui-pets.js` | Pets panel, hunt/fish cooldown buttons, pet grid with upgrade rows and legendary ability buttons |
| `ui-crates.js` | Crates panel, timed crate countdowns, crate open animation |
| `ui-prestige.js` | Prestige panel, rebirth progress section, prestige progress section, prestige shop cards |
| `ui-settings.js` | Settings panel, register modal, GM panel, leaderboard modal with category tabs |

### 🔄 Cross-module dependency notes
- `ui-core.js` exports all shared helpers (`setText`, `setStyle`, `toggleClass`, `escapeHTML`, `formatCooldown`, etc.) — all other UI modules import from here rather than duplicating definitions.
- `switchTab()` in `ui-core.js` uses dynamic imports (`await import(...)`) to load each panel renderer on demand, avoiding circular dependency issues at the module level.
- `ui-crates.js` imports `renderBoosterBadges` from `ui-mine.js` to refresh the booster badge display on the Mine panel after a crate is opened — the only intentional cross-panel dependency.

### 📝 main.js import block updated
The single `import ... from "./ui.js"` line has been replaced with seven targeted imports, one per new module.

### Files changed
`js/ui/ui-core.js` *(new)* · `js/ui/ui-hud.js` *(new)* · `js/ui/ui-mine.js` *(new)* · `js/ui/ui-pets.js` *(new)* · `js/ui/ui-crates.js` *(new)* · `js/ui/ui-prestige.js` *(new)* · `js/ui/ui-settings.js` *(new)* · `js/main.js` · ~~`js/ui.js`~~ *(deleted)*

</details>

<details>
<summary><strong>v1.2.0 — Security Fixes & Visual Identity</strong></summary>

### 🔒 Bug Fix: Logout data persistence (critical)
- **Problem:** Logging out did not wipe localStorage. The previous account's full game state (cash, pets, rebirths, ore) remained on the device as guest data, allowing players to duplicate progress between accounts.
- **Fix:** `logoutUser()` in `auth.js` now explicitly calls `localStorage.removeItem(SAVE_KEY)` and resets the in-memory state to `DEFAULT_STATE` before creating a fresh guest session. The cloud copy is always the source of truth.
- **Fix:** `loadCloudSave()` now also wipes state before applying cloud data, preventing any leftover guest progress from bleeding into a newly logged-in account.

### 🔒 Bug Fix: GM leaderboard hide was clientside only (critical)
- **Problem:** The "hide from leaderboard" toggle in the GM panel only filtered rows clientside for the GM themselves. When any other player (including guests) loaded the leaderboard, the GM row appeared normally.
- **Fix:** Leaderboard table now has a `hidden` boolean column in Supabase. Supabase RLS policy updated to `USING (hidden = false)` on the public SELECT policy — hidden rows are filtered server-side and never returned to any client, regardless of who is asking.
- **Fix:** `toggleLeaderboardVisibility()` in `leaderboard.js` writes the `hidden` flag directly to Supabase. `gm.js` delegates to this function instead of mutating local state.

### 👑 Feature: VIP badge in HUD
- VIP players now see a pulsing gold **👑 VIP** badge directly next to their nickname in the top HUD bar.
- Badge is injected dynamically by `renderHUD()` and removed automatically when VIP expires.
- New CSS class `.vip-badge-hud` and shared `.vip-pulse` animation class added to `style.css`.

### 🎨 Feature: Dimension-colored nicknames
- Player nicknames in the HUD are now colored by their **current dimension's accent color** (e.g. green for Earth, red for Nether, purple for The End).
- Color transitions smoothly when switching dimensions via CSS `transition: color 0.5s`.
- Leaderboard rows now show each player's nickname in their **own dimension color**, fetched from the `dimension` column submitted with their leaderboard score.

### 👑 Feature: VIP badge in leaderboard
- VIP players now show a pulsing **👑 VIP** badge before their nickname in every leaderboard row.
- `is_vip` and `dimension` columns added to the `leaderboard` table in Supabase.
- `submitLeaderboardScore()` in `leaderboard.js` now submits `is_vip`, `dimension`, and preserves the existing `hidden` flag on every score update.

### 🗄️ Database changes
Run the following in Supabase SQL Editor before deploying this version:

```sql
ALTER TABLE leaderboard
  ADD COLUMN IF NOT EXISTS is_vip     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dimension  text    DEFAULT 'earth',
  ADD COLUMN IF NOT EXISTS hidden     boolean DEFAULT false;

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS is_vip         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_expires_at bigint  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player_id      text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS role           integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_player_saves_player_id ON player_saves (player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_hidden ON leaderboard (hidden);

DROP POLICY IF EXISTS "Users can manage own leaderboard entry" ON leaderboard;
CREATE POLICY "Users can manage own leaderboard entry"
  ON leaderboard FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read leaderboard" ON leaderboard;
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT USING (hidden = false);
```

### Files changed
`auth.js` · `leaderboard.js` · `gm.js` · `ui.js` · `style.css`

</details>

<details>
<summary><strong>v1.1.0 — Leaderboard & VIP Polish</strong></summary>

### Leaderboard → Floating Button
- Removed the Leaderboard tab from the bottom nav (now 5 tabs)
- Added a floating **🏆 trophy button** fixed above the tab bar, right side
- Leaderboard now opens as a **bottom-sheet modal** with blur backdrop and slide-up animation
- Modal dismisses via close button or tapping the backdrop

### VIP Badge & Pulse
- Removed VIP badge from the HUD nickname — nickname is now plain text
- VIP badge in **leaderboard rows** upgraded: now shows 👑 icon, pill shape, and pulsing gold glow (`vip-badge-lb`)
- VIP card in Settings now has an **animated gold ring pulse** (`vip-card-pulse`) — breathing border glow behind the card content

### GM Leaderboard Toggle Fix
- Fixed: hide-from-leaderboard toggle was a session-only in-memory flag — it reset to visible on every page refresh
- Fix: toggle now persists in `state` / localStorage via `gmHiddenFromLeaderboard` field added to `DEFAULT_STATE`

### Files changed
`gm.js` · `state.js` · `index.html` · `main.js` · `ui.js` · `style.css`

</details>

<details>
<summary><strong>v1.0.0 — Initial Release</strong></summary>

- Idle mining game loop (1s tick, auto-mine, sell, upgrade)
- 13 ore types, 13 mine tiers, 9 dimensions
- 13 pets across 4 rarities with hunt/fish cooldowns and legendary abilities
- Crate system: hourly / daily / weekly timed crates + common/rare/legendary drops
- Rebirth and Prestige progression with a 4-upgrade prestige shop
- Guest mode (localStorage) + registered accounts (Supabase cloud save)
- Global leaderboard (Rebirths, Blocks Mined, Cash Earned, Pets Owned)
- VIP system with 2× sell, auto-sell, 12h offline mining
- Game Master panel with stat overrides and VIP management
- Deployed on Vercel with serverless env var injection

</details>

---

## 🙏 Credits

- Icons: [Font Awesome 6 Free](https://fontawesome.com)
- Game icons: [game-icons.net](https://game-icons.net) via jsDelivr CDN (CC BY 3.0)
- Inspired by the [Discord Idle Miner bot](https://theidleminerbot.com)
