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
  toggleLeaderboardVisibilityForPlayer,
} from "../supabase.js";
import { showToast } from "../ui/ui-core.js";
import { renderBoosterBadges } from "../ui/ui-mine.js";
import { renderGMPanel } from "../ui/ui-settings.js";

// ── Helpers ──────────────────────────────────────────────────
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function gmMsg(id, text, success) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = success ? "#4caf50" : success === false ? "#f44336" : "#aaa";
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

  // ── GM own leaderboard toggle ──
  if (e.target.id === "btn-gm-lb-toggle") {
    await toggleGMLeaderboardVisibility();
    renderGMPanel();
    return;
  }

  // ── Target player leaderboard toggle ──
  if (e.target.id === "btn-gm-target-lb-toggle") {
    await handleGMTargetLbToggle();
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

  // ── VIP actions (use target.playerId — no input needed) ──
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
  renderGMPanel();
  gmMsg("gm-lookup-message", `Found: ${result.nickname}`, true);
}

// ============================================================
// SECTION 4 — TARGET LEADERBOARD TOGGLE
// ============================================================

async function handleGMTargetLbToggle() {
  const target = window.__gmTarget;
  if (!target) return;

  gmMsg("gm-lookup-message", "Updating leaderboard visibility...", null);
  const result = await toggleLeaderboardVisibilityForPlayer(target.id);
  gmMsg("gm-lookup-message", result.message, result.success);

  if (result.success) {
    // Update cached target so toggle button reflects new state
    target.lbHidden = result.hidden;
    renderGMPanel();
  }
}

// ============================================================
// SECTION 5 — SET VALUES
// Race condition fix: pass cachedData so no re-fetch happens
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

  // Pass cached gameData to avoid re-fetch race condition
  const patch  = { [field]: Math.floor(n) };
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-message", result.message, result.success);

  if (result.success) {
    if (input) input.value = "";
    // Use merged result to keep cache fully up to date
    if (result.merged) target.gameData = result.merged;
    else if (target.gameData) target.gameData[field] = Math.floor(n);
    renderGMPanel();
  }
}

// ============================================================
// SECTION 6 — GM BUFFS / BOOSTERS
// Race condition fix: pass cachedData + update from result.merged
// ============================================================

async function handleGMBooster(boosterKey, mode) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-booster-message", "No player selected.", false); return; }

  if (mode === "clear") {
    const patch  = { boosters: { [boosterKey]: { multiplier: 1, endsAt: 0, isGm: false } } };
    gmMsg("gm-booster-message", "Clearing...", null);
    const result = await gmApplyToPlayer(target.id, patch, target.gameData);
    gmMsg("gm-booster-message", result.message, result.success);
    if (result.success) {
      if (result.merged) target.gameData = result.merged;
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

  if (isNaN(mult) || mult < 1) { gmMsg("gm-booster-message", "Multiplier must be \u2265 1.", false); return; }
  if (isNaN(mins) || mins < 1) { gmMsg("gm-booster-message", "Duration must be \u2265 1 min.", false); return; }

  gmMsg("gm-booster-message", "Applying GM Buff...", null);

  const patch  = buildBoosterPatch(boosterKey, mult, mins);

  // KEY FIX: pass target.gameData as cachedData so the write uses
  // the latest local copy — avoids overwriting previous buffs when
  // applying multiple boosts quickly without reloading
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-booster-message", result.message, result.success);

  if (result.success) {
    if (multInput) multInput.value = "";
    if (minsInput) minsInput.value = "";
    // Update cached gameData from the merged result so next patch is correct
    if (result.merged) target.gameData = result.merged;
    renderGMPanel();
    renderBoosterBadges();
    showToast(`GM Buff: ${boosterKey} ${mult}x for ${mins}min`, "success", 3000);
  }
}

// ============================================================
// SECTION 7 — CRATE MANAGEMENT
// Race condition fix: same cachedData pattern
// ============================================================

async function handleGMCrate(crateId, mode) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-crate-message", "No player selected.", false); return; }

  const amtInput = document.getElementById(`gm-crate-amt-${crateId}`);
  const amount   = amtInput?.value?.trim();

  if (!amount || amount === "0") { gmMsg("gm-crate-message", "Enter an amount (min 1).", false); return; }

  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 1) { gmMsg("gm-crate-message", "Invalid amount.", false); return; }

  gmMsg("gm-crate-message", "Applying...", null);

  const currentCrates = target.gameData?.crates || {};
  const patch         = buildCratePatch(currentCrates, crateId, n, mode);

  // Pass cachedData to avoid re-fetch overwriting previous crate changes
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-crate-message", result.message, result.success);

  if (result.success) {
    if (amtInput) amtInput.value = "";
    if (result.merged) target.gameData = result.merged;
    renderGMPanel();
    showToast(`${mode === "add" ? "Added" : "Removed"} ${n}x ${crateId} crate`, "success", 2500);
  }
}

// ============================================================
// SECTION 8 — VIP MANAGEMENT
// Uses target.playerId directly — no Player ID input needed
// ============================================================

async function handleGMGrantVip() {
  const target   = window.__gmTarget;
  const daysInput = document.getElementById("gm-vip-days");
  const days      = parseInt(daysInput?.value?.trim(), 10);

  if (!target) { gmMsg("gm-vip-message", "Look up a player first.", false); return; }
  if (!days || days < 1) { gmMsg("gm-vip-message", "Enter valid days (min 1).", false); return; }

  gmMsg("gm-vip-message", "Granting VIP...", null);
  const result = await grantVipByPlayerId(target.playerId, days);
  gmMsg("gm-vip-message", result.message, result.success);
  if (result.success && daysInput) daysInput.value = "";
}

async function handleGMRevokeVip() {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-vip-message", "Look up a player first.", false); return; }

  gmMsg("gm-vip-message", "Revoking...", null);
  const result = await revokeVipByPlayerId(target.playerId);
  gmMsg("gm-vip-message", result.message, result.success);
}

async function handleGMCheckVip() {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-vip-message", "Look up a player first.", false); return; }

  gmMsg("gm-vip-message", "Checking...", null);
  const result = await checkVipByPlayerId(target.playerId);
  gmMsg("gm-vip-message", result.message,
    result.success ? (result.isVip ? true : null) : false);
}
