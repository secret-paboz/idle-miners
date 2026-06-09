// ============================================================
// UI-VANTA.JS — Vanta.js FOG background manager
//
// Two modes:
//   CYCLE  — login/guest screen: fog shifts through all 9
//            dimension colors in a smooth loop
//   LOCKED — in-game: fog is pinned to the active dimension's
//            particleColor and updates on every dimension switch
// ============================================================

// ── Fog color map — keyed by dimension ID ──────────────────
// Values come from particleColor in dimensions-data.js
const DIM_FOG_COLORS = {
  earth:   0x4caf50,
  cave:    0xff6f00,
  snow:    0xffffff,
  nether:  0xff6d00,
  crimson: 0xf06292,
  warped:  0x64ffda,
  end:     0xce93d8,
  void:    0x651fff,
  aether:  0xfff176,
};

// Cycle order — all 9 dimensions in progression order
const CYCLE_ORDER = [
  "earth", "cave", "snow", "nether", "crimson",
  "warped", "end", "void", "aether",
];

// How long each color step holds before transitioning (ms)
const CYCLE_STEP_MS  = 3000;
// How many lerp ticks per step (smoother = more ticks)
const LERP_TICKS     = 60;
// Ms between lerp ticks
const LERP_TICK_MS   = CYCLE_STEP_MS / LERP_TICKS;

// ── Module state ───────────────────────────────────────────
let vantaEffect    = null;   // the live Vanta instance
let cycleTimer     = null;   // setInterval for color cycling
let lerpTimer      = null;   // setInterval for per-step lerp
let cycleIndex     = 0;      // current position in CYCLE_ORDER
let isCycling      = false;

// ── Helpers ────────────────────────────────────────────────

/** Convert a 0xRRGGBB integer to { r, g, b } (0–255 each) */
function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >>  8) & 0xff,
    b:  hex        & 0xff,
  };
}

/** Linearly interpolate two hex color integers by t (0–1) */
function lerpColor(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl= Math.round(a.b + (b.b - a.b) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Push a new highlight/mid color to the live Vanta instance */
function applyFogColor(hexInt) {
  if (!vantaEffect) return;
  vantaEffect.setOptions({
    highlightColor: hexInt,
    midtoneColor:   Math.round(hexInt * 0.45), // darker midtone
    lowlightColor:  0x0d0d0d,
    baseColor:      0x0a0a0a,
  });
}

/** Stop any running lerp or cycle timers */
function clearTimers() {
  if (lerpTimer)  { clearInterval(lerpTimer);  lerpTimer  = null; }
  if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
}

// ── Smooth lerp between two colors ────────────────────────

function lerpToColor(fromHex, toHex, onDone) {
  if (lerpTimer) clearInterval(lerpTimer);
  let tick = 0;
  lerpTimer = setInterval(() => {
    tick++;
    const t = tick / LERP_TICKS;
    applyFogColor(lerpColor(fromHex, toHex, Math.min(t, 1)));
    if (tick >= LERP_TICKS) {
      clearInterval(lerpTimer);
      lerpTimer = null;
      if (onDone) onDone();
    }
  }, LERP_TICK_MS);
}

// ── Public API ─────────────────────────────────────────────

/**
 * initVanta(dimensionId)
 * Call once on page load. Pass the player's current dimension
 * (from saved state), or null / "earth" for guest/default.
 */
export function initVanta(dimensionId = "earth") {
  // Guard: Vanta must be loaded as a global by the CDN script
  if (typeof VANTA === "undefined" || typeof THREE === "undefined") {
    console.warn("[ui-vanta] Vanta or Three.js not loaded — skipping fog init");
    return;
  }

  const initialColor = DIM_FOG_COLORS[dimensionId] ?? DIM_FOG_COLORS.earth;

  vantaEffect = VANTA.FOG({
    el:             "#vanta-bg",
    THREE,
    mouseControls:  false,
    touchControls:  false,
    gyroControls:   false,
    minHeight:      200,
    minWidth:       200,
    highlightColor: initialColor,
    midtoneColor:   Math.round(initialColor * 0.45),
    lowlightColor:  0x0d0d0d,
    baseColor:      0x0a0a0a,
    blurFactor:     0.62,
    speed:          1.2,
    zoom:           0.8,
  });
}

/**
 * startColorCycle()
 * Begins the login-screen color cycling mode.
 * Smoothly loops through all 9 dimension fog colors.
 */
export function startColorCycle() {
  if (!vantaEffect) return;
  isCycling  = true;
  cycleIndex = 0;

  function stepToNext() {
    if (!isCycling) return;
    const fromId  = CYCLE_ORDER[cycleIndex];
    cycleIndex    = (cycleIndex + 1) % CYCLE_ORDER.length;
    const toId    = CYCLE_ORDER[cycleIndex];
    const fromHex = DIM_FOG_COLORS[fromId];
    const toHex   = DIM_FOG_COLORS[toId];

    lerpToColor(fromHex, toHex, () => {
      // After lerp finishes, wait CYCLE_STEP_MS then move to next
      if (isCycling) {
        cycleTimer = setTimeout(stepToNext, CYCLE_STEP_MS);
      }
    });
  }

  // Kick off the first step after a short initial hold
  cycleTimer = setTimeout(stepToNext, CYCLE_STEP_MS);
}

/**
 * stopColorCycle()
 * Stops the login color cycling. Call before locking to a
 * specific dimension (e.g. on login or dimension switch).
 */
export function stopColorCycle() {
  isCycling = false;
  clearTimers();
}

/**
 * updateVantaFog(dimensionId)
 * Smoothly transitions the fog to a specific dimension's color.
 * Stops any running cycle first.
 */
export function updateVantaFog(dimensionId) {
  if (!vantaEffect) return;
  stopColorCycle();

  const toHex = DIM_FOG_COLORS[dimensionId] ?? DIM_FOG_COLORS.earth;

  // Read current highlight color from Vanta's options as "from"
  const fromHex = vantaEffect.options?.highlightColor ?? DIM_FOG_COLORS.earth;

  lerpToColor(fromHex, toHex);
}

/**
 * destroyVanta()
 * Clean up — call if the app ever needs a full teardown.
 */
export function destroyVanta() {
  stopColorCycle();
  if (vantaEffect) {
    vantaEffect.destroy();
    vantaEffect = null;
  }
}
