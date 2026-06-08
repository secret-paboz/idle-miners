# Changelog — 09 June 2026

## 🔧 v1.0.2 — Bug Fixes, UI/UX Polish & PC Experience

---

### 🐛 Bug Fixes

- **Prestige reset dimensions, pets, and crates** — `resetStateForPrestige()` in `state.js` was starting from `DEFAULT_STATE`, wiping all unlocked dimensions, owned pets, and crate inventory on prestige. Fixed by carrying forward `rebirths`, `dimensionUnlocked`, `pets`, `crates`, `cashEarned`, and `blocksMined` into the kept state — matching the behaviour of `resetStateForRebirth()`.

- **HUD income rate showed half actual earnings** — The income rate display in `ui-hud.js` was calculating `(power / 2) * oreValue` instead of `power * oreValue`. Players were seeing exactly half their real earnings rate in the HUD. Fixed.

- **Leaderboard "YOU" tag matched by nickname (fragile)** — `renderLbRows()` in `ui-core.js` was identifying the current player by comparing `row.nickname === myNick`. Duplicate nicknames would highlight the wrong row. Fixed to use `row.isCurrentPlayer`, which is already set reliably by `leaderboard.js`.

- **"Prestige 0 complete!" message on first prestige** — `doPrestige()` in `economy.js` read `state.prestiges` before `resetStateForPrestige()` had incremented it, so the first prestige always displayed "Prestige 0 complete!". Fixed — the counter is now incremented inside `resetStateForPrestige()` before the message is read.

---

### 🎨 UI/UX Polish

#### Design Tokens (`variables.css`)
- Added animation easing tokens: `--anim-bounce`, `--anim-smooth`, `--anim-fast`, `--anim-normal`, `--anim-slow`
- Added `--bg-outside` token for PC chrome background

#### PC Experience (`layout.css`)
- **PC background** — A subtle dot-grid pattern now fills the empty space outside the 480px game column. The app container gains a border and drop shadow so it looks intentional on wide screens instead of floating in black.
- **Scrollbar** — Widened from 3px to 5px with a hover highlight, making it usable with a mouse.
- **Panel transition** — Switched to `--anim-smooth` easing with a slightly longer travel distance for a more premium feel on panel switch.
- **Dimension fade** — `#content.dim-switching` class added; briefly dims content when switching dimensions for a more deliberate transition feel.
- **FAB tooltip** — CSS `::after` tooltip appears on hover showing "Menu" via the `title` attribute. No JS needed.
- **Income rate pulse keyframe** — `ratePulse` animation fires on the rate element when the value changes.

#### Components (`components.css`)
- **Cursor rules** — Global block ensures all buttons, menu items, cards, and interactive elements show `pointer` cursor; disabled elements show `not-allowed`.
- **Button bounce** — `btn-primary` and `btn-ghost` now scale to 0.97 on `:active` for satisfying click feedback. `btn-primary` shows an accent glow on hover.
- **Progress bars** — Smoother easing using new animation tokens.
- **Typed toasts** — Four variants: `toast-success` (green ✓), `toast-error` (red ✕), `toast-info` (blue ℹ), `toast-warning` (amber ⚠). Each has a colored border tint, background tint, and inline prefix icon via `::before`.

#### Panels (`panels.css`)
- **Upgrade buttons** — Lift + stronger glow on hover, bounce on click, extra glow when affordable.
- **Sell button** — Scale bounce on active press.
- **Pet cards** — Smooth lift and stronger rarity glow on hover (owned pets only).
- **Crate timers** — `crateReadyPulse` breathing animation fires continuously when a crate is claimable, drawing the eye.
- **Claim buttons** — Bounce on click, green glow on hover.
- **Pet bonus summary** — New `.pets-bonus-summary` chip styles added for the bonus banner.
- **Ore bar tick flash** — `tickFlash` keyframe brightens the bar briefly on each mine tick.
- **Crate ready burst** — `crateJustReady` scale burst + green glow fires the moment a crate becomes claimable.
- **Claim button pop** — `btnJustReady` overshoot bounce fires when the claim button transitions from "Waiting" to "Claim".
- **Reward icon bounce** — `rewardIconBounce` spin-in animation on the icon inside crate reward cards.

#### Modals (`modals.css`)
- **Toast entrance** — Bounce-in using `--anim-bounce` token; scale + translate from slightly below.
- **Modal box entrance** — `modalBoxIn` bounce animation so modals feel snappy, not flat.
- **Cancel/confirm buttons** — Added hover highlight, active bounce, and glow on confirm across all modals.
- **Prestige keep/lose list** — New `.prestige-confirm-lists` styles with green "keep" chips and red "lose" chips, ready for JS to populate.
- **Close button consistency** — Unified scale bounce on hover/active across leaderboard, GM, stats, and confirm modals.

---

### ⛏️ Mine Panel (`ui-mine.js`, `handlers/auth.js`)
- **Upgrade button ripple** — Pointer-down fires a circular ripple animation on pickaxe and backpack upgrade buttons.
- **Dimension switch fade** — Switching dimensions briefly dims `#content` via the `dim-switching` class for a smooth transition feel.
- **Ore bar tick shimmer** — The ore bar flashes slightly brighter on each tick when ore is mined.

---

### 🎁 Crates Panel (`ui-crates.js`)
- **"Just became ready" detection** — `_prevReady` tracks the previous tick's ready state. The exact moment a crate becomes claimable fires a burst animation on the slot and a pop on the claim button.
- **Ring snaps on ready** — The SVG countdown ring instantly snaps to full when ready instead of slowly sliding.
- **Reward icon bounce** — Crate reward card icons spin in with a bounce animation on open.

---

### 📊 HUD (`ui-hud.js`)
- **Income rate pulse** — `rate-pulse` animation fires only when the displayed rate value actually changes (e.g. after an upgrade or dimension switch).
- **PC tooltip** — The income rate element gets a `title` attribute with the exact unformatted value (e.g. `$12,450 per second`) for mouse users.
- **Cash tint by income tier** — The cash display subtly tints green at ≥$1k/s, ≥$10k/s, and ≥$100k/s income rates, giving a visual progression reward for scaling up.

---

### 🐾 Pets Panel (`ui-pets.js`, `index.html`)
- **Pet bonus summary banner** — A new banner above the pet grid shows three chips: total Mining bonus, Sell bonus, and Backpack bonus from all owned pets combined. Chips are greyed out at 0%. A hint is shown when no pets are owned yet.

---

### ⌨️ Keyboard Shortcuts (`handlers/keys.js`, `main.js`)
- **New file: `js/handlers/keys.js`** — Full keyboard shortcut system for PC users.
- Shortcuts:

  | Key | Action |
  |-----|--------|
  | `M` | Mine panel |
  | `P` | Pets panel |
  | `C` | Crates panel |
  | `R` | Prestige/Rebirth panel |
  | `S` | Settings panel |
  | `L` | Leaderboard modal |
  | `1–5` | Panels in order |
  | `Space` | Sell ore (Mine panel only) |
  | `Escape` | Close any open modal or FAB menu |

- Shortcuts suppressed when typing in an input or when a modal is open.
- A brief tooltip flashes bottom-left on each keypress confirming the action.
- First-time hover over the app shows a one-time hint that shortcuts are active.

---

### 📁 Files Changed

| File | Type |
|------|------|
| `js/state.js` | Bug fix |
| `js/economy.js` | Bug fix |
| `js/ui/ui-core.js` | Bug fix |
| `js/ui/ui-hud.js` | Bug fix + Polish |
| `js/ui/ui-mine.js` | Polish |
| `js/ui/ui-crates.js` | Polish |
| `js/ui/ui-pets.js` | Polish |
| `js/handlers/auth.js` | Polish |
| `js/handlers/keys.js` | New file |
| `js/main.js` | Wiring |
| `css/variables.css` | Polish |
| `css/layout.css` | Polish |
| `css/components.css` | Polish |
| `css/panels.css` | Polish |
| `css/modals.css` | Polish |
| `index.html` | Polish |

---

> *Keep mining! ⛏️*
