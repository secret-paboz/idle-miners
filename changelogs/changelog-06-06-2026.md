# Changelog — 06 June 2026

## 🚀 v1.0.0 — Initial Launch

Welcome to **Idle Miners**! The game is now live. Here's everything that ships with the launch.

---

### ⛏️ Core Gameplay
- Idle mining loop — tap or let it run automatically
- Pickaxe upgrades increase mining power
- Backpack upgrades increase ore capacity
- Ore auto-sells when backpack is full
- Offline income calculated on return based on time away

### 💰 Economy
- Dynamic ore value scaling with dimension, rebirths, and prestige upgrades
- Speed booster and sell booster available via Crates
- VIP sell multiplier (2×) for VIP players

### 🔁 Prestige System
- **Prestige** — reset pickaxe & backpack levels in exchange for Prestige Tokens
- **4 Prestige Upgrades** (20 levels each): Merchant, Greed, Speed, Storage
- **Rebirth** — deep reset granting permanent +10% ore value per rebirth
- Every 3 rebirths unlocks the next Dimension

### 🌍 Dimensions (9 total)
- Earth → Cave → Snow → Nether → Crimson → Warped → End → Void → Aether
- Multipliers range from 1× (Earth) up to 150× (Aether)
- Unlock by reaching rebirth milestones

### 🐾 Pets
- 13 pets across 4 rarities: Common, Uncommon, Rare, Legendary
- Each rarity grants a different passive bonus (backpack / mining / sell)
- Pets level up using shards (max level varies by rarity)
- Legendary pets: **Wither** (mining bonus) and **Ender Dragon** (sell bonus)

### 🎁 Crates
- Open crates to receive pets, boosters, and shards
- Rarity-weighted drop system

### 🏆 Leaderboard
- Global leaderboard ranked by rebirths
- Shows nickname, rebirths, blocks mined, cash earned, pets owned, dimension
- VIP badge displayed for VIP players
- Players can hide themselves from the leaderboard at any time

### 👤 Accounts & Auth
- Register with email, Player ID, and nickname
- Log in / log out
- Guest mode — play without an account (local save only)
- Login screen shown on every page load for logged-out players
- **Forgot Password** — sends a reset link via email
- Cloud save synced on every auto-save interval
- Conflict resolution on login (local vs cloud, pick the most recent)

### ☁️ Cloud Save
- Game state saved to Supabase on a regular auto-save interval
- Server-side anti-cheat validation on every save
- VIP status always authoritative from server (tamper-proof)
- Local save kept as fallback if cloud is unavailable

### 💎 VIP
- Timed VIP status with 2× sell multiplier and leaderboard badge
- VIP expiry handled and enforced server-side

### 🛡️ Game Master
- GM role (`role = 99`) with full cheat panel
- GMs bypass server-side save validation
- GM status verified server-side — cannot be faked client-side

---

### 🗒️ Known Issues at Launch
- None reported yet — please submit bugs via the community Discord.

---

> *Built with ⛏️ — thanks for playing Idle Miners!*
