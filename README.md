# ⛏️ Idle Miners

A browser-based incremental idle game built with vanilla JavaScript, Vite, Supabase, and Vercel.
Mine ore, sell it for cash, prestige, collect pets, unlock dimensions — and compete on the global leaderboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Setup Guide](#setup-guide)
  - [1. GitHub](#1-github)
  - [2. Supabase](#2-supabase)
  - [3. Vercel](#3-vercel)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Security Model](#security-model)
- [Game Systems](#game-systems)

---

## Features

- ⛏️ Idle mining with auto-progression
- 💰 Ore selling, cash economy
- 🔁 Prestige & Rebirth systems with permanent upgrades
- 🐾 Pet collection (Common → Legendary) with passive bonuses
- 🌍 9 unlockable Dimensions with unique multipliers
- 🎁 Crate system with random rewards
- 🏆 Global leaderboard with opt-out toggle
- ☁️ Cloud save with server-side anti-cheat validation
- 👤 Account system (register / login / guest) via Supabase Auth
- 🔑 VIP system with timed perks
- 🛡️ GM (Game Master) role with full cheat panel

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| Build Tool | [Vite](https://vitejs.dev/) |
| Backend / API | [Vercel](https://vercel.com/) Serverless Functions |
| Database & Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Package Manager | npm |

---

## Project Structure

```
idle-miners/
├── index.html              # Full game UI — all panels pre-rendered
├── manifest.json           # PWA manifest
├── vite.config.js          # Vite config (dev proxy → Vercel)
├── vercel.json             # Vercel routes & build config
├── package.json
│
├── api/                    # Vercel serverless functions
│   ├── env.js              # Serves Supabase credentials to the client
│   ├── save.js             # Server-side save validator + writer
│   └── delete.js           # Wipes a player's cloud save
│
├── css/
│   ├── variables.css       # Design tokens, CSS reset, dimension themes
│   ├── layout.css          # HUD, tab bar, panel layout
│   ├── components.css      # Boot spinner, buttons, shared UI
│   ├── panels.css          # Mine, shop, pets, prestige panels
│   ├── settings.css        # Auth forms, settings panel
│   └── modals.css          # Toast, modals, login screen, forgot password
│
├── js/
│   ├── main.js             # Boot sequence, game loop, event binding
│   ├── state.js            # Game state definition + localStorage save/load
│   ├── globals.js          # Shared runtime constants
│   ├── auth.js             # Supabase auth (login, register, guest, reset)
│   ├── supabase.js         # Cloud save/load, VIP, leaderboard gateway
│   ├── leaderboard.js      # Leaderboard fetch, submit, hide/show
│   ├── economy.js          # Mining power, sell value, income calculations
│   ├── prestige.js         # Prestige & rebirth logic
│   ├── pets.js             # Pet unlock, level-up, bonus calculations
│   ├── crates.js           # Crate opening and reward resolution
│   ├── gm.js               # Game Master cheat panel logic
│   │
│   ├── data/
│   │   ├── dimensions-data.js   # Dimension definitions & unlock costs
│   │   ├── mines-data.js        # Ore types per dimension
│   │   └── pets-data.js         # Pet definitions (rarity, modifier, maxLevel)
│   │
│   ├── handlers/
│   │   ├── auth.js         # Auth button handlers (login, register, logout, forgot pw)
│   │   ├── gm.js           # GM panel action handlers
│   │   ├── leaderboard.js  # Leaderboard UI handlers
│   │   ├── mine.js         # Mine tap, sell, auto-sell handlers
│   │   ├── pets.js         # Pet panel interaction handlers
│   │   ├── prestige.js     # Prestige/rebirth confirmation handlers
│   │   └── settings.js     # Settings panel handlers
│   │
│   └── ui/
│       ├── ui-core.js      # Toast, boot spinner, login screen, tab system
│       ├── ui-hud.js       # HUD (cash, level, XP bar) renderer
│       ├── ui-mine.js      # Mine panel renderer
│       ├── ui-pets.js      # Pets panel renderer
│       ├── ui-prestige.js  # Prestige panel renderer
│       ├── ui-settings.js  # Settings panel, register modal, forgot pw modal
│       └── ui-crates.js    # Crate opening animation & UI
│
└── public/
    └── sprites/            # Game sprite assets
```

---

## Local Development

**Prerequisites:** Node.js ≥ 18, npm, [Vercel CLI](https://vercel.com/docs/cli)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/idle-miners.git
cd idle-miners

# 2. Install dependencies
npm install

# 3. Install Vercel CLI globally (needed to run API routes locally)
npm install -g vercel

# 4. Link to your Vercel project (first time only)
vercel link

# 5. Pull environment variables from Vercel
vercel env pull .env.local

# 6. Run the dev server (Vite) and API (Vercel) together
#    Open two terminals:

# Terminal 1 — API server
vercel dev --listen 3000

# Terminal 2 — Vite frontend
npm run dev
```

> **Why two terminals?** Vite proxies `/api/*` requests to `localhost:3000` where `vercel dev` serves the serverless functions. This mirrors the production setup exactly.

---

## Setup Guide

### 1. GitHub

<details>
<summary><strong>Create & push your repository</strong></summary>

1. Go to [github.com/new](https://github.com/new)
2. Create a new **private** repository named `idle-miners`
3. Do **not** initialise with a README (you already have one)
4. In your project folder, run:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/idle-miners.git
git push -u origin main
```

5. Subsequent deploys to Vercel will trigger automatically on every push to `main`.

</details>

---

### 2. Supabase

<details>
<summary><strong>Create project & configure auth</strong></summary>

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, strong database password, and your nearest region
3. Wait for the project to finish provisioning (~1 min)
4. Go to **Project Settings → API** and note down:
   - `Project URL` → your `SUPABASE_URL`
   - `anon / public` key → your `SUPABASE_ANON_KEY`
   - `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY` ⚠️ keep this secret

**Configure Auth:**

1. Go to **Authentication → Providers** → ensure **Email** is enabled
2. Go to **Authentication → Email Templates** and customise the password reset email if you like
3. Go to **Authentication → URL Configuration** and add your Vercel domain to **Redirect URLs**:
   ```
   https://your-app.vercel.app
   http://localhost:5173
   ```

</details>

<details>
<summary><strong>Run the SQL — create all tables, indexes & RLS policies</strong></summary>

Go to **SQL Editor** in your Supabase dashboard and run the following:

```sql
-- ============================================================
-- TABLE: player_saves
-- Stores each player's full game state and account metadata.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.player_saves (
  id              UUID        PRIMARY KEY,  -- matches auth.users.id
  player_id       TEXT        NOT NULL UNIQUE,
  nickname        TEXT        NOT NULL DEFAULT 'Player',
  email           TEXT,                     -- used for Player ID → email login lookup
  game_data       TEXT,                     -- JSON blob (stringified)
  is_vip          BOOLEAN     NOT NULL DEFAULT false,
  vip_expires_at  BIGINT      NOT NULL DEFAULT 0,  -- Unix ms timestamp
  role            INTEGER     NOT NULL DEFAULT 0,  -- 0=player, 99=GM
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by player_id (used during login)
CREATE INDEX IF NOT EXISTS idx_player_saves_player_id
  ON public.player_saves (player_id);

-- ============================================================
-- TABLE: leaderboard
-- Separate from player_saves so leaderboard queries are fast.
-- Updated on every cloud save.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id           UUID        PRIMARY KEY,  -- matches auth.users.id
  nickname     TEXT        NOT NULL DEFAULT 'Player',
  rebirths     INTEGER     NOT NULL DEFAULT 0,
  blocks_mined BIGINT      NOT NULL DEFAULT 0,
  cash_earned  FLOAT8      NOT NULL DEFAULT 0,
  pets_owned   INTEGER     NOT NULL DEFAULT 0,
  is_vip       BOOLEAN     NOT NULL DEFAULT false,
  dimension    TEXT        NOT NULL DEFAULT 'earth',
  hidden       BOOLEAN     NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index to sort leaderboard by rebirths descending
CREATE INDEX IF NOT EXISTS idx_leaderboard_rebirths
  ON public.leaderboard (rebirths DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.player_saves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard    ENABLE ROW LEVEL SECURITY;

-- player_saves: users can only read their own row
CREATE POLICY "Users can read own save"
  ON public.player_saves
  FOR SELECT
  USING (auth.uid() = id);

-- player_saves: users can only insert their own row
CREATE POLICY "Users can insert own save"
  ON public.player_saves
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- player_saves: service role bypasses RLS (used by api/save.js)
-- No UPDATE policy needed for anon/user — all writes go via api/save.js
-- which uses the service role key.

-- leaderboard: anyone can read non-hidden rows
CREATE POLICY "Anyone can read leaderboard"
  ON public.leaderboard
  FOR SELECT
  USING (hidden = false);

-- leaderboard: authenticated users can upsert their own row
CREATE POLICY "Users can upsert own leaderboard entry"
  ON public.leaderboard
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

> **Note:** `api/save.js` uses the `service_role` key which bypasses RLS entirely. The RLS policies above protect direct client access via the anon key.

</details>

---

### 3. Vercel

<details>
<summary><strong>Import project & add environment variables</strong></summary>

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and select your `idle-miners` repo
3. Framework preset: **Vite** (Vercel usually auto-detects this)
4. Build settings are handled by `vercel.json` — leave defaults
5. Before clicking **Deploy**, go to **Environment Variables** and add:

| Name | Value | Environments |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `eyJh...` (anon key) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` (service role key) | Production, Preview, Development |

6. Click **Deploy** ✅

**After first deploy:**

- Go to your Supabase project → **Authentication → URL Configuration**
- Add your live Vercel URL to **Redirect URLs**:
  ```
  https://your-app.vercel.app
  ```

**Automatic deploys:**

Every push to `main` triggers a new production deploy automatically.
Pull requests get their own preview URL.

</details>

---

## Environment Variables

| Variable | Where used | Description |
|---|---|---|
| `SUPABASE_URL` | `api/env.js`, `api/save.js`, `api/delete.js` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | `api/env.js` | Public anon key — safe to send to client |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/save.js`, `api/delete.js` | ⚠️ Server-only. Bypasses RLS. Never expose to client. |

> The client never receives the service role key. `api/env.js` intentionally excludes it and only serves `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

---

## Database Schema

### `player_saves`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Matches `auth.users.id` |
| `player_id` | `text` UNIQUE | Public-facing player identifier |
| `nickname` | `text` | Display name |
| `email` | `text` | Used for Player ID → email lookup during login |
| `game_data` | `text` | Full game state as a JSON string |
| `is_vip` | `boolean` | VIP status flag |
| `vip_expires_at` | `bigint` | VIP expiry as Unix ms timestamp |
| `role` | `integer` | `0` = player, `99` = Game Master |
| `updated_at` | `timestamptz` | Last save timestamp |

### `leaderboard`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Matches `auth.users.id` |
| `nickname` | `text` | Display name |
| `rebirths` | `integer` | Primary sort key |
| `blocks_mined` | `bigint` | Total blocks mined |
| `cash_earned` | `float8` | Lifetime cash earned |
| `pets_owned` | `integer` | Number of pets owned |
| `is_vip` | `boolean` | VIP badge flag |
| `dimension` | `text` | Current dimension |
| `hidden` | `boolean` | Opt-out of leaderboard |
| `updated_at` | `timestamptz` | Last submission timestamp |

---

## API Endpoints

All endpoints are Vercel serverless functions in `/api/`.

### `GET /api/env`

Returns Supabase public credentials as a `window.__ENV__` script block.
Called by `index.html` on load before any JS runs.

**Response:**
```js
window.__ENV__ = {
  SUPABASE_URL:      "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJh..."
};
```

---

### `POST /api/save`

Server-side validated cloud save.

**Headers:** `Authorization: Bearer <supabase_jwt>`

**Body:**
```json
{
  "userId": "uuid",
  "gameData": { ...full game state object... }
}
```

**Pipeline:**
1. Verify JWT with Supabase admin client
2. Confirm `userId` matches JWT identity
3. Fetch player `role` and authoritative VIP status from DB
4. If `role !== 99`: run full math-based anti-cheat validation
5. Strip client-supplied VIP fields, replace with server values
6. Upsert row into `player_saves`

**Responses:**

| Status | Meaning |
|---|---|
| `200` | Save successful |
| `400` | Missing/invalid request body |
| `401` | Missing or invalid JWT |
| `403` | userId mismatch |
| `422` | Validation failed (cheat detected) |
| `500` | Server/DB error |

---

### `POST /api/delete`

Wipes a player's `game_data` (sets it to `null`). Does not delete the row or auth account.

**Headers:** `Authorization: Bearer <supabase_jwt>`

**Body:**
```json
{ "userId": "uuid" }
```

---

## Security Model

<details>
<summary><strong>How saves are protected against cheating</strong></summary>

`api/save.js` re-calculates theoretical maximum values using the player's **own submitted stats** as inputs, then checks their submitted `cash`, `ore`, and `blocksMined` against those ceilings.

Validation checks include:

- All numeric fields are within hard-coded min/max bounds
- `cashEarned` ≥ `cash` (can't have more cash than ever earned)
- `ore` ≤ computed max backpack capacity
- `cashEarned` ≤ `capacity × oreValue × 10,000 sells` (lifetime ceiling)
- `blocksMined` ≤ `miningPower × 30 days` (time ceiling)
- Dimension unlocks match rebirth count
- Prestige upgrade levels within allowed range

**Game Masters** (`role = 99`) bypass validation entirely so they can test any game state.

**VIP status is always authoritative from the server** — client-submitted `isVip` and `vipExpiresAt` are stripped and replaced with the values stored in Supabase, preventing localStorage tampering.

</details>

<details>
<summary><strong>Why the anon key is safe to expose</strong></summary>

The Supabase `anon` key is a **public key** — it is the intended and documented pattern to ship it to the browser. Access is controlled entirely by **Row Level Security (RLS)** policies on each table. The anon key cannot:

- Bypass RLS to read other users' data
- Write to `player_saves` directly (all writes go through `api/save.js` which uses the service role key)
- Access the service role key or any server-side credentials

The `service_role` key (which does bypass RLS) **never leaves the server** and is only used inside Vercel serverless functions.

</details>

---

## Game Systems

<details>
<summary><strong>Mining & Economy</strong></summary>

- **Mining Power** = `(pickaxeLevel + speedPrestige) × (1 + petMiningBonus) × boosterMulti`
- **Ore Value** = `oreBaseValue × dimensionMulti × rebirthBonus × greedBonus × merchantBonus × (1 + petSellBonus) × boosterMulti × vipBonus`
- **Backpack Capacity** = `20 + (backpackLevel × 15) × (1 + petBackpackBonus) + (storagePrestige × 10)`
- Ore auto-sells when the backpack fills
- Game loop and auto-save only start after the player logs in or selects guest mode

</details>

<details>
<summary><strong>Prestige & Rebirth</strong></summary>

- **Prestige** resets pickaxe/backpack levels in exchange for Prestige Tokens
- **Prestige Upgrades** (4 types, 20 levels each): Merchant, Greed, Speed, Storage
- **Rebirth** is a harder reset — resets prestiges, tokens, and upgrades but grants a permanent `+10% ore value` per rebirth
- Every 3 rebirths unlocks the next Dimension

</details>

<details>
<summary><strong>Pets</strong></summary>

| Rarity | Bonus Type | Max Level |
|---|---|---|
| Common | Backpack capacity | 50 |
| Uncommon | Mining power | 50 |
| Rare | Sell value | 40 |
| Legendary (Wither) | Mining power | 30 |
| Legendary (Ender Dragon) | Sell value | 30 |

Pets are obtained from Crates. Each pet can be levelled up with shards.

</details>

<details>
<summary><strong>Dimensions</strong></summary>

| Dimension | Multiplier | Unlock |
|---|---|---|
| Earth | 1× | Default |
| Cave | 5× | 3 rebirths |
| Snow | 10× | 6 rebirths |
| Nether | 20× | 9 rebirths |
| Crimson | 35× | 12 rebirths |
| Warped | 55× | 15 rebirths |
| End | 80× | 18 rebirths |
| Void | 115× | 21 rebirths |
| Aether | 150× | 24 rebirths |

</details>

---

> Built with ⛏️ by the Idle Miners team.

