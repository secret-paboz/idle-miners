# ⛏️ Idle Miners

A browser-based idle mining game inspired by the Discord Idle Miner bot. Mine ore automatically, upgrade your gear, collect pets, open crates, and prestige your way through 9 dimensions.

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
- Pickaxe and Backpack upgrades scale with a 1.15× cost curve
- XP and levelling system — higher level = better ore tiers
- Offline progress calculated on return (capped at 8h for regular, 12h for VIP). VIP players cycle through full mine→sell loops for the entire offline duration — regular players fill once.

</details>

<details>
<summary><strong>🌍 Dimensions (9 total)</strong></summary>

Unlock a new dimension every 3 Rebirths. Each one multiplies all ore value.

| Dimension | Rebirths Needed | Value Multiplier |
|---|---|---|
| Earth | 0 | 1× |
| Deep Cave | 3 | 2.5× |
| Snow | 6 | 5× |
| Nether | 9 | 10× |
| Crimson Forest | 12 | 18× |
| Warped Forest | 15 | 30× |
| The End | 18 | 50× |
| The Void | 21 | 80× |
| The Aether | 24 | 150× |

</details>

<details>
<summary><strong>🐾 Pets (13 total)</strong></summary>

Hunt and Fish to find pets. Each rarity buffs a different stat.

| Rarity | Effect | Pets |
|---|---|---|
| Common | +Backpack capacity | Chicken, Cow, Pig, Sheep |
| Uncommon | +Mining speed | Creeper, Zombie, Skeleton, Spider |
| Rare | +Sell value | Blaze, Enderman, Guardian |
| Legendary | Special passive | Wither (+mining bonus), Ender Dragon (+sell bonus) |

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
- **Auto-Sell** when backpack hits 100% capacity — cycles mine→sell repeatedly during offline progress too
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
- **Auto-save** runs every 30 seconds for logged-in players
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

Each player's nickname is colored by their current dimension color. VIP players are marked with a pulsing **👑 VIP** badge. Hidden players are completely invisible to all viewers — enforced server-side via Supabase RLS, not client-side filtering.

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
| Leaderboard visibility toggle | Hide/show GM account — enforced server-side via Supabase RLS |
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
    ├── economy.js          # All game math (mining, selling, upgrades). VIP offline loop fix.
    ├── auth.js             # Login, register, logout, guest mode
    ├── supabase.js         # Cloud save gateway — POSTs to api/save.js
    ├── gm.js               # Game Master role check + GM actions
    ├── pets.js             # Hunt, fish, pet abilities
    ├── crates.js           # Crate opening + booster logic
    ├── prestige.js         # Rebirth/prestige gates + shop
    ├── leaderboard.js      # Fetch + submit leaderboard scores
    ├── ui/
    │   ├── ui-core.js      # Shared helpers, tab navigation, toast, modal, offline progress modal, cloud banner
    │   ├── ui-hud.js       # Top HUD bar renderer
    │   ├── ui-mine.js      # Mine panel + mining animations, bar danger states, affordability
    │   ├── ui-pets.js      # Pets panel renderer
    │   ├── ui-crates.js    # Crates panel + crate reward card animation
    │   ├── ui-prestige.js  # Prestige panel renderer
    │   └── ui-settings.js  # Settings, leaderboard, register modal, GM panel
    └── data/
        ├── mines-data.js       # Ore types + mine tiers
        ├── dimensions-data.js  # Dimension unlocks + multipliers
        └── pets-data.js        # Pet definitions + rarity config
```

---

## ☁️ Supabase Setup

This project uses a single Supabase table: `player_saves`.

### 1. Create the table

Run this SQL in your Supabase project → **SQL Editor**:

```sql
create table public.player_saves (
  id               uuid primary key references auth.users(id) on delete cascade,
  player_id        text unique not null,
  nickname         text not null default 'Player',
  game_data        jsonb,
  role             integer not null default 0,
  is_vip           boolean not null default false,
  vip_expires_at   bigint not null default 0,
  updated_at       timestamptz not null default now()
);
```

**Column reference:**

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Matches the Supabase Auth user ID — primary key |
| `player_id` | `text` | Unique player-chosen ID used for VIP management and leaderboard |
| `nickname` | `text` | Display name shown in HUD and leaderboard |
| `game_data` | `jsonb` | Full serialized game state |
| `role` | `integer` | `0` = player, `99` = Game Master |
| `is_vip` | `boolean` | Whether VIP is currently active |
| `vip_expires_at` | `bigint` | VIP expiry as a Unix timestamp (ms). `0` = no VIP |
| `updated_at` | `timestamptz` | Timestamp of last cloud save |

---

### 2. Enable Row Level Security (RLS)

```sql
-- Enable RLS
alter table public.player_saves enable row level security;

-- Players can read their own row
create policy "Players can read own save"
  on public.player_saves for select
  using (auth.uid() = id);

-- Players can insert their own row
create policy "Players can insert own save"
  on public.player_saves for insert
  with check (auth.uid() = id);

-- Players can update their own row
create policy "Players can update own save"
  on public.player_saves for update
  using (auth.uid() = id);

-- Leaderboard: only show players who have not hidden themselves (role != 99)
create policy "Leaderboard visible rows"
  on public.player_saves for select
  using (role != 99 or auth.uid() = id);
```

> The GM hide toggle sets `role = 99` — the RLS policy above ensures hidden accounts are invisible to all other players at the database level, not just filtered client-side.

---

### 3. Add environment variables

Add these to your **Vercel project settings** → Environment Variables:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service_role key) |

---

## 🚀 Deployment (Vercel)

1. Fork or clone this repo
2. Connect it to [Vercel](https://vercel.com)
3. Add the three environment variables above
4. Deploy — `api/env.js` injects the keys at runtime so they never ship in the client bundle. `api/save.js` validates all cloud saves server-side before writing to the database.

> **Note:** `package.json` must be present in the repo root so Vercel installs `@supabase/supabase-js` for the serverless functions.

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

## 🙏 Credits

- Developed by [Piererra](https://www.facebook.com/piererra)
- Icons: [Font Awesome 6 Free](https://fontawesome.com)
- Game icons: [game-icons.net](https://game-icons.net) via jsDelivr CDN (CC BY 3.0)
- Inspired by the [Discord Idle Miner bot](https://theidleminerbot.com)
