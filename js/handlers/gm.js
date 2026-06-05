// ============================================================
// HANDLERS/GM.JS — Game Master panel event handlers
// Flow: GM looks up a player first → target stored in
//       window.__gmTarget → all action sections unlock
// ============================================================

import {
  toggleGMLeaderboardVisibility,
  buildBoosterPatch,
  buildCratePatch,
} from "../gm.js";
import {
  grantVipByPlayerId,
  revokeVipByPlayerId,
  checkVipByPlayerId,
  lookupPlayer,
  gmApplyToPlayer,
} from "../supabase.js";
import { showToast } from "../ui/ui-core.js";
import { renderHUD } from "../ui/ui-hud.js";
import { renderMinePanel, renderBoosterBadges } from "../ui/ui-mine.js";
import { renderGMPanel } from "../ui/ui-settings.js";

// ── Helpers ──────────────────────────────────────────────────
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function gmMsg(id, text, success) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent   = text;
  el.style.color   = success ? "#4caf50" : success === false ? "#f44336" : "#aaa";
}

// ============================================================
// SECTION 1 — BIND
// ============================================================

export function bindGMEvents() {
  on("btn-gm-close", "click", handleToggleGMModal);

  const gmModal = document.getElementById("gm-modal");
  if (gmModal) {
    gmModal.addEventListener("click", (e) => {
      if (e.target === gmModal) handleToggleGMModal();
    });
    gmModal.addEventListener("click", handleGMClick);
  }
}

function handleToggleGMModal() {
  const modal = document.getElementById("gm-modal");
  if (!modal) return;
  const isVisible = modal.style.display === "flex";
  modal.style.display = isVisible ? "none" : "flex";
  if (!isVisible) renderGMPanel();
}

// ============================================================
// SECTION 2 — MAIN CLICK DISPATCHER
// ============================================================

async function handleGMClick(e) {

  // ── Leaderboard toggle ──
  if (e.target.id === "btn-gm-lb-toggle") {
    await toggleGMLeaderboardVisibility();
    renderGMPanel();
    return;
  }

  // ── Player lookup ──
  if (e.target.id === "btn-gm-lookup") {
    await handleGMLookup();
    return;
  }

  // ── Clear target ──
  if (e.target.id === "btn-gm-clear-target") {
    window.__gmTarget = null;
    renderGMPanel();
    return;
  }

  // ── VIP actions ──
  if (e.target.id === "btn-gm-grant-vip")  { await handleGMGrantVip();  return; }
  if (e.target.id === "btn-gm-revoke-vip") { await handleGMRevokeVip(); return; }
  if (e.target.id === "btn-gm-check-vip")  { await handleGMCheckVip();  return; }

  // ── Set value buttons ──
  const setBtn = e.target.closest("[data-gm-action]");
  if (setBtn) { await handleGMSetValue(setBtn.dataset.gmAction); return; }

  // ── Booster set ──
  const boosterSetBtn = e.target.closest("[data-gm-booster]");
  if (boosterSetBtn) { await handleGMBooster(boosterSetBtn.dataset.gmBooster, "set"); return; }

  // ── Booster clear ──
  const boosterClearBtn = e.target.closest("[data-gm-booster-clear]");
  if (boosterClearBtn) { await handleGMBooster(boosterClearBtn.dataset.gmBoosterClear, "clear"); return; }

  // ── Crate add ──
  const crateAddBtn = e.target.closest("[data-gm-crate-add]");
  if (crateAddBtn) { await handleGMCrate(crateAddBtn.dataset.gmCrateAdd, "add"); return; }

  // ── Crate remove ──
  const crateRemoveBtn = e.target.closest("[data-gm-crate-remove]");
  if (crateRemoveBtn) { await handleGMCrate(crateRemoveBtn.dataset.gmCrateRemove, "remove"); return; }
}

// ============================================================
// SECTION 3 — PLAYER LOOKUP
// ============================================================

async function handleGMLookup() {
  const query = document.getElementById("gm-lookup-query")?.value?.trim();
  if (!query) { gmMsg("gm-lookup-message", "Enter a Player ID or nickname.", false); return; }

  gmMsg("gm-lookup-message", "Looking up...", null);

  const result = await lookupPlayer(query);

  if (!result.success) {
    gmMsg("gm-lookup-message", result.message, false);
    window.__gmTarget = null;
    renderGMPanel();
    return;
  }

  window.__gmTarget = result;
  gmMsg("gm-lookup-message", `Found: ${result.nickname}`, true);
  renderGMPanel();
}

// ============================================================
// SECTION 4 — SET VALUES (applied to target player remotely)
// ============================================================

async function handleGMSetValue(action) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-message", "No player selected.", false); return; }

  const input = document.getElementById(`gm-input-${action}`);
  const value = input?.value?.trim();
  if (!value && value !== "0") { gmMsg("gm-message", "Enter a value first.", false); return; }

  const n = parseFloat(value);
  if (isNaN(n) || n < 0) { gmMsg("gm-message", "Invalid value.", false); return; }

  const fieldMap = {
    cash:       "cash",
    shards:     "shards",
    ore:        "ore",
    level:      "level",
    xp:         "xp",
    pickaxe:    "pickaxeLevel",
    backpack:   "backpackLevel",
    rebirths:   "rebirths",
    ptokens:    "prestigeTokens",
    cashearned: "cashEarned",
  };

  const field = fieldMap[action];
  if (!field) return;

  gmMsg("gm-message", "Applying...", null);

  const patch  = { [field]: Math.floor(n) };
  const result = await gmApplyToPlayer(target.id, patch);

  gmMsg("gm-message", result.message, result.success);

  if (result.success) {
    if (input) input.value = "";
    // Update cached game_data so counts refresh on re-render
    if (target.gameData) target.gameData[field] = Math.floor(n);
    renderGMPanel();
  }
}

// ============================================================
// SECTION 5 — GM BUFFS / BOOSTERS
// ============================================================

async function handleGMBooster(boosterKey, mode) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-booster-message", "No player selected.", false); return; }

  if (mode === "clear") {
    const patch  = { boosters: { [boosterKey]: { multiplier: 1, endsAt: 0 } } };
    gmMsg("gm-booster-message", "Clearing...", null);
    const result = await gmApplyToPlayer(target.id, patch);
    gmMsg("gm-booster-message", result.message, result.success);
    if (result.success) {
      if (target.gameData?.boosters) {
        target.gameData.boosters[boosterKey] = { multiplier: 1, endsAt: 0 };
      }
      renderGMPanel();
      renderBoosterBadges();
    }
    return;
  }

  // mode === "set"
  const multInput = document.getElementById(`gm-booster-mult-${boosterKey}`);
  const minsInput = document.getElementById(`gm-booster-mins-${boosterKey}`);
  const mult = parseFloat(multInput?.value);
  const mins = parseFloat(minsInput?.value);

  if (isNaN(mult) || mult < 1) { gmMsg("gm-booster-message", "Multiplier must be ≥ 1.", false); return; }
  if (isNaN(mins) || mins < 1) { gmMsg("gm-booster-message", "Duration must be ≥ 1 min.", false); return; }

  gmMsg("gm-booster-message", "Applying GM Buff...", null);

  const patch  = buildBoosterPatch(boosterKey, mult, mins);
  const result = await gmApplyToPlayer(target.id, patch);

  gmMsg("gm-booster-message", result.message, result.success);

  if (result.success) {
    if (multInput) multInput.value = "";
    if (minsInput) minsInput.value = "";
    // Update cached game_data
    if (!target.gameData.boosters) target.gameData.boosters = {};
    target.gameData.boosters[boosterKey] = patch.boosters[boosterKey];
    renderGMPanel();
    renderBoosterBadges();
    showToast(`GM Buff applied: ${boosterKey} ${mult}x for ${mins}min`, "success", 3000);
  }
}

// ============================================================
// SECTION 6 — CRATE MANAGEMENT
// ============================================================

async function handleGMCrate(crateId, mode) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-crate-message", "No player selected.", false); return; }

  const amtInput = document.getElementById(`gm-crate-amt-${crateId}`);
  const amount   = amtInput?.value?.trim();

  if (!amount || amount === "0") {
    gmMsg("gm-crate-message", "Enter an amount (min 1).", false);
    return;
  }

  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 1) { gmMsg("gm-crate-message", "Invalid amount.", false); return; }

  gmMsg("gm-crate-message", "Applying...", null);

  const currentCrates = target.gameData?.crates || {};
  const patch         = buildCratePatch(currentCrates, crateId, n, mode);
  const result        = await gmApplyToPlayer(target.id, patch);

  gmMsg("gm-crate-message", result.message, result.success);

  if (result.success) {
    if (amtInput) amtInput.value = "";
    // Update cached crates so counts update on re-render
    if (!target.gameData.crates) target.gameData.crates = {};
    target.gameData.crates = patch.crates;
    renderGMPanel();
    showToast(`${mode === "add" ? "Added" : "Removed"} ${n}x ${crateId} crate`, "success", 2500);
  }
}

// ============================================================
// SECTION 7 — VIP MANAGEMENT
// ============================================================

async function handleGMGrantVip() {
  const playerIdInput = document.getElementById("gm-vip-playerid");
  const daysInput     = document.getElementById("gm-vip-days");
  const playerId      = playerIdInput?.value?.trim();
  const days          = parseInt(daysInput?.value?.trim(), 10);

  if (!playerId) { gmMsg("gm-vip-message", "Enter a Player ID.", false); return; }
  if (!days || days < 1) { gmMsg("gm-vip-message", "Enter valid days (min 1).", false); return; }

  gmMsg("gm-vip-message", "Granting VIP...", null);
  const result = await grantVipByPlayerId(playerId, days);
  gmMsg("gm-vip-message", result.message, result.success);

  if (result.success) {
    if (playerIdInput) playerIdInput.value = "";
    if (daysInput)     daysInput.value     = "";
  }
}

async function handleGMRevokeVip() {
  const playerIdInput = document.getElementById("gm-vip-playerid");
  const playerId      = playerIdInput?.value?.trim();

  if (!playerId) { gmMsg("gm-vip-message", "Enter a Player ID.", false); return; }

  gmMsg("gm-vip-message", "Revoking...", null);
  const result = await revokeVipByPlayerId(playerId);
  gmMsg("gm-vip-message", result.message, result.success);

  if (result.success && playerIdInput) playerIdInput.value = "";
}

async function handleGMCheckVip() {
  const playerIdInput = document.getElementById("gm-vip-playerid");
  const playerId      = playerIdInput?.value?.trim();

  if (!playerId) { gmMsg("gm-vip-message", "Enter a Player ID.", false); return; }

  gmMsg("gm-vip-message", "Checking...", null);
  const result = await checkVipByPlayerId(playerId);
  gmMsg("gm-vip-message", result.message,
    result.success ? (result.isVip ? true : null) : false);
}
