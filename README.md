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
- All cloud saves are validated server-side before being written

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

**GM status is never stored client-side.** It is verified at runtime by reading the `role` column from Supabase — role `99` = Game Master. This prevents any client-side manipulation. The server also checks this role on every save request — if a non-GM player submits values that exceed mathematical limits, the save is rejected.

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
├── package.json            # Node dependencies (required for api/save.js)
├── api/
│   ├── env.js              # Serverless env var injector (keeps keys out of client bundle)
│   └── save.js             # Serverless save validator (math checks + GM role verification)
├── css/
│   ├── variables.css       # Design tokens, CSS reset, base elements, dimension themes
│   ├── layout.css          # App shell, HUD, content area, tab bar, safe area
│   ├── components.css      # Cards, progress bars, buttons, shared animations
│   ├── panels.css          # Mine, Pets, Crates, Prestige panel styles
│   ├── modals.css          # Toast, confirm modal, leaderboard modal, floating FAB
│   └── settings.css        # Auth forms, settings panel, GM panel, VIP system
├── sprites/                # Ore sprite PNGs (24×24px, one per ore type)
└── js/
    ├── main.js             # Entry point, game loop, event binding
    ├── state.js            # Global game state + localStorage save/load
    ├── economy.js          # All game math (mining, selling, upgrades)
    ├── auth.js             # Login, register, logout, guest mode
    ├── supabase.js         # Cloud save gateway — POSTs to api/save.js
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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service_role key) |

4. Deploy — Vercel serves `api/env.js` as a serverless function that injects the env vars at runtime. `api/save.js` validates all cloud saves server-side before writing to the database.

> **Note:** `package.json` must be present in the repo root so Vercel installs `@supabase/supabase-js` for the serverless functions.

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
<summary><strong>v1.7.0 — Ore Sprites, Mine UI/UX Polish</strong></summary>

### 🎨 Feature: Ore sprite floating text
- Mining tick animation now shows `[sprite] +N OreName` instead of a plain `+N` number.
- 13 ore sprites (dirt, stone, coal, copper, iron, gold, redstone, lapis, emerald, diamond, obsidian, netherite, ancientDebris) served from `/sprites/` as 24×24px optimized PNGs (down from 216×196px originals — 96% size reduction).
- Floating text uses `display: flex` with `align-items: center` so the sprite and label sit inline.
- `image-rendering: pixelated` keeps sprites crisp at small size.
- Sell float animation unchanged — still shows `+$N` in green with no sprite.

**Files changed:** `js/ui/ui-mine.js` · `css/components.css`
**Assets added:** `sprites/` *(13 PNG files, 24×24px)*

---

### 🗑️ Removed: Ore Type stat cell
- The "Ore Type" stat cell has been removed from the Stats grid in the Mine panel.
- Ore type is now communicated through the floating text sprite on every mining tick — showing it twice was redundant.
- Stats grid reflows cleanly from 8 to 7 cells in the existing 2-column layout.

**Files changed:** `index.html` · `js/ui/ui-mine.js`

---

### ✨ Improvement: Ore bar glow states
- `high` state (≥75% full) now emits a soft green glow (`box-shadow: 0 0 8px rgba(67,160,71,0.5)`).
- `full` state (100%) now emits a red glow (`box-shadow: 0 0 12px rgba(229,57,53,0.6)`) in addition to the existing pulse animation.
- Both transitions are smooth via `transition: box-shadow 0.3s ease`.

**Files changed:** `css/panels.css`

---

### ✨ Improvement: Upgrade button affordability glow
- `.upgrade-btn.can-afford` now includes a subtle gold `box-shadow` (`0 0 10px rgba(255,193,7,0.2)`) in addition to the existing border and background tint.
- More readable on Android dark screens where border color alone is easy to miss.

**Files changed:** `css/panels.css`

---

### ✨ Improvement: Sell button layout
- Sell button now uses `flex-direction: column` so the ore count sits cleanly below the label.
- Ore amount and estimated value use distinct opacity levels for better visual hierarchy.

**Files changed:** `css/panels.css`

</details>

<details>
<summary><strong>v1.6.0 — Server-side Save Validation & GM Role Enforcement</strong></summary>

### 🛡️ Feature: Server-side math validation on all cloud saves
- All cloud saves for logged-in players now go through `api/save.js` — a Vercel serverless function that validates save data before writing to Supabase.
- The server recalculates the theoretical maximum possible stats using the player's own submitted values (pickaxe level, backpack level, pets, boosters, prestige upgrades, rebirths, VIP status) and rejects any save where submitted values exceed what's mathematically achievable.
- Checks performed: ore vs backpack capacity, cash earned vs lifetime sell ceiling, blocks mined vs 30-day continuous max, shards hard cap, dimension count vs rebirth count, all field types and ranges.
- Saves still write locally first as a backup — if the server rejects the save, the player keeps their local copy and sees a warning.

**Files changed:** `api/save.js` *(rewritten)* · `js/supabase.js`

---

### 🛡️ Feature: GM role verified server-side on every save
- When a save request arrives at `api/save.js`, the server fetches the player's `role` from Supabase using the service role key.
- If `role === 99` (Game Master) — math validation is skipped entirely, save is written as-is.
- If `role !== 99` — full math validation runs. A non-GM player cannot bypass this by editing localStorage or browser memory.

**Files changed:** `api/save.js`

---

### 🗑️ Removed: HackShield token system
- Removed `api/verify.js`, `js/hackshield.js`, and all token-based session validation.
- The token system caused save rollbacks when tabs went idle, phones locked screens, or sessions exceeded 90 minutes.
- Replaced entirely by the server-side math validation approach above.

**Files deleted:** `api/verify.js` · `js/hackshield.js`
**Files changed:** `js/main.js` · `js/economy.js` · `js/supabase.js`

---

### 🐛 Fix: Cloud saves failing silently (missing package.json)
- Added `package.json` declaring `@supabase/supabase-js` as a dependency so Vercel installs it for the serverless function.

**Files added:** `package.json`

</details>

<details>
<summary><strong>v1.5.0 — Bug Fixes, UX Polish & Stability</strong></summary>

### 🐛 Fix: Dimension icons not displaying
- `renderDimensionSelector()` was only outputting the dimension name — the `icon` field was never rendered.
- Also fixed: `fa-earth-americas` (Font Awesome Pro) replaced with `fa-globe` (Font Awesome 6 Free).

**Files changed:** `js/data/dimensions-data.js` · `js/ui/ui-mine.js`

---

### ✨ Improvement: VIP badge shimmer animation
- Replaced pulsing gold glow with a diagonal shimmer sweep on a 2.8s loop.

**Files changed:** `css/settings.css`

---

### ✨ Improvement: Live ore bar updates
- Added `renderMinePanel()` to the game loop (`RENDER_MINE_EVERY = 2` ticks).

**Files changed:** `js/main.js`

---

### 🐛 Fix: Ore type mismatch on sell toast
- `sellOre()` was calling `rollOre()` for the toast — a fresh random roll unrelated to what was mined.
- Fixed by adding `currentOreId` to state, updated by `tickMining()` on every tick.

**Files changed:** `js/state.js` · `js/economy.js` · `js/ui/ui-mine.js`

---

### 🛡️ Fix: Offline progress guard against corrupted timestamps
- Added validation rejecting elapsed times that are non-finite, zero/negative, or over 30 days.

**Files changed:** `js/economy.js`

---

### ✨ Improvement: Boot loading spinner
- Added full-screen spinner overlay during `boot()`.

**Files changed:** `js/main.js` · `js/ui/ui-core.js` · `css/components.css`

</details>

<details>
<summary><strong>v1.4.0 — CSS Refactor: Modular Stylesheet Architecture</strong></summary>

### 🎨 Refactor: style.css split into 6 focused files under css/

| File | Responsibility |
|---|---|
| `variables.css` | Design tokens, CSS reset, base elements, dimension themes |
| `layout.css` | App shell, HUD, content area, tab bar, safe area |
| `components.css` | Cards, progress bars, buttons, shared animations |
| `panels.css` | Mine, Pets, Crates, Prestige panel styles |
| `modals.css` | Toast, confirm modal, leaderboard modal, floating FAB |
| `settings.css` | Auth forms, settings panel, GM panel, VIP system |

**Files changed:** `css/` *(6 new files)* · `index.html` · ~~`style.css`~~ *(deleted)*

</details>

<details>
<summary><strong>v1.3.0 — UI Refactor: Modular Architecture</strong></summary>

### 🏗️ Refactor: ui.js split into dedicated modules

| File | Responsibility |
|---|---|
| `ui-core.js` | Shared DOM helpers, tab navigation, toast, modal |
| `ui-hud.js` | Top HUD bar |
| `ui-mine.js` | Mine panel + animations |
| `ui-pets.js` | Pets panel |
| `ui-crates.js` | Crates panel |
| `ui-prestige.js` | Prestige panel + shop |
| `ui-settings.js` | Settings, register modal, GM panel, leaderboard |

**Files changed:** `js/ui/` *(7 new files)* · `js/main.js` · ~~`js/ui.js`~~ *(deleted)*

</details>

<details>
<summary><strong>v1.2.0 — Security Fixes & Visual Identity</strong></summary>

- 🔒 **Fix:** Logout now wipes localStorage
- 🔒 **Fix:** GM leaderboard hide enforced server-side via Supabase RLS
- 👑 **Feature:** VIP badge in HUD with shimmer animation
- 🎨 **Feature:** Dimension-colored nicknames in HUD and leaderboard
- 👑 **Feature:** VIP badge in leaderboard rows

**Files changed:** `auth.js` · `leaderboard.js` · `gm.js` · `ui.js` · `style.css`

</details>

<details>
<summary><strong>v1.1.0 — Leaderboard & VIP Polish</strong></summary>

- Leaderboard moved from tab to floating trophy button + bottom-sheet modal
- VIP card animated gold ring pulse in Settings
- GM leaderboard hide toggle now persists in localStorage

**Files changed:** `gm.js` · `state.js` · `index.html` · `main.js` · `ui.js` · `style.css`

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
