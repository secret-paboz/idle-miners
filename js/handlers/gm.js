// ============================================================
// HANDLERS/GM.JS — Game Master panel event handlers
// Flow: GM looks up a player first → target stored in
//       window.__gmTarget → all action sections unlock
//
// New in this version:
//   - Confirm sheet (E) for destructive / value-setting actions
//   - Audit log (B) via window.__gmLog[]
//   - Quick-action chip handlers (A)
//   - "My Leaderboard" toggle removed (handled by Player Lookup)
//   - Accordion collapse toggle wired via renderGMPanel
// ============================================================

import {
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
  el.style.color = success ? "#4caf50" : success === false ? "#f44336" : "#888";
}

// ============================================================
// SECTION 1 — AUDIT LOG
// window.__gmLog is an array of { type, icon, text, time }
// type: "set" | "remove" | "boost" | "crate" | "vip"
// ============================================================

function gmLog(type, icon, text) {
  if (!window.__gmLog) window.__gmLog = [];
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  // Prepend so newest is on top
  window.__gmLog.unshift({ type, icon, text, time });
  // Cap at 50 entries
  if (window.__gmLog.length > 50) window.__gmLog.length = 50;

  // Live-update the log list without full re-render
  const list = document.getElementById("gm-log-list");
  if (list) {
    const entry = document.createElement("div");
    entry.className = `gm-log-entry log-${type}`;
    entry.innerHTML = `
      <i class="${icon} gm-log-icon"></i>
      <span class="gm-log-text">${text}</span>
      <span class="gm-log-time">${time}</span>
    `;
    list.insertBefore(entry, list.firstChild);
    // Remove empty-state placeholder if present
    list.querySelectorAll(".gm-log-empty").forEach(el => el.remove());

    // Show clear button in log card header if not already there
    const logHeader = document.querySelector("#gm-card-log .gm-card-header");
    if (logHeader && !logHeader.querySelector(".gm-log-clear-btn")) {
      const clearBtn = document.createElement("button");
      clearBtn.className = "gm-log-clear-btn";
      clearBtn.id        = "btn-gm-log-clear";
      clearBtn.textContent = "Clear";
      clearBtn.style.cssText = "margin-left:auto;text-transform:none;letter-spacing:0;font-size:10px";
      logHeader.appendChild(clearBtn);
    }
  }
}

// ============================================================
// SECTION 2 — CONFIRM SHEET (mobile bottom-sheet)
// Returns a Promise<boolean> — true if confirmed, false if cancelled.
// ============================================================

function gmConfirm(labelHTML) {
  return new Promise(resolve => {
    // Remove any existing sheet
    document.getElementById("gm-confirm-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id        = "gm-confirm-overlay";
    overlay.className = "gm-confirm-overlay";
    overlay.innerHTML = `
      <div class="gm-confirm-sheet" id="gm-confirm-sheet">
        <div class="gm-confirm-handle"></div>
        <div class="gm-confirm-title">Confirm Action</div>
        <div class="gm-confirm-body">${labelHTML}</div>
        <div class="gm-confirm-actions">
          <button class="btn-gm-confirm-cancel" id="btn-gm-confirm-cancel">Cancel</button>
          <button class="btn-gm-confirm-ok"     id="btn-gm-confirm-ok">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function close(val) {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.15s";
      setTimeout(() => overlay.remove(), 160);
      resolve(val);
    }

    document.getElementById("btn-gm-confirm-ok").addEventListener("click",     () => close(true));
    document.getElementById("btn-gm-confirm-cancel").addEventListener("click", () => close(false));
    overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
  });
}

// ============================================================
// SECTION 3 — BIND
// ============================================================

export function bindGMEvents() {
  on("btn-gm-close", "click", handleToggleGMModal);

  const gmModal = document.getElementById("gm-modal");
  if (gmModal) {
    gmModal.addEventListener("click", e => {
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
// SECTION 4 — MAIN CLICK DISPATCHER
// ============================================================

async function handleGMClick(e) {

  // ── Accordion card toggle ──
  // (also handled inline in renderGMPanel; this catches dynamic re-renders)
  const accordionHeader = e.target.closest("[data-gm-toggle]");
  if (accordionHeader && !e.target.closest(".gm-log-clear-btn") && !e.target.closest(".btn-gm-lookup")) {
    // renderGMPanel wires its own listeners; this is a fallback no-op
    return;
  }

  // ── Log clear ──
  if (e.target.id === "btn-gm-log-clear" || e.target.closest("#btn-gm-log-clear")) {
    window.__gmLog = [];
    const list = document.getElementById("gm-log-list");
    if (list) list.innerHTML = `<div class="gm-log-empty"><i class="fa-solid fa-clock-rotate-left"></i> No actions yet this session</div>`;
    const clearBtn = document.getElementById("btn-gm-log-clear");
    if (clearBtn) clearBtn.remove();
    return;
  }

  // ── Target player leaderboard toggle ──
  if (e.target.id === "btn-gm-target-lb-toggle" || e.target.closest("#btn-gm-target-lb-toggle")) {
    await handleGMTargetLbToggle();
    return;
  }

  // ── Player lookup ──
  if (e.target.id === "btn-gm-lookup" || e.target.closest("#btn-gm-lookup")) {
    await handleGMLookup();
    return;
  }

  // ── Clear target ──
  if (e.target.id === "btn-gm-clear-target" || e.target.closest("#btn-gm-clear-target")) {
    window.__gmTarget = null;
    renderGMPanel();
    return;
  }

  // ── VIP actions ──
  if (e.target.id === "btn-gm-grant-vip"  || e.target.closest("#btn-gm-grant-vip"))  { await handleGMGrantVip();  return; }
  if (e.target.id === "btn-gm-revoke-vip" || e.target.closest("#btn-gm-revoke-vip")) { await handleGMRevokeVip(); return; }
  if (e.target.id === "btn-gm-check-vip"  || e.target.closest("#btn-gm-check-vip"))  { await handleGMCheckVip();  return; }

  // ── Quick action: set value ──
  const quickSetBtn = e.target.closest("[data-gm-quick-set]");
  if (quickSetBtn) { await handleGMQuickSet(quickSetBtn.dataset.gmQuickSet, quickSetBtn.dataset.value); return; }

  // ── Quick action: boost ──
  const quickBoostBtn = e.target.closest("[data-gm-quick-boost]");
  if (quickBoostBtn) { await handleGMQuickBoost(quickBoostBtn.dataset.gmQuickBoost, quickBoostBtn.dataset.mult, quickBoostBtn.dataset.mins); return; }

  // ── Quick action: crate add ──
  const quickCrateBtn = e.target.closest("[data-gm-quick-crate-add]");
  if (quickCrateBtn) { await handleGMQuickCrateAdd(quickCrateBtn.dataset.gmQuickCrateAdd, quickCrateBtn.dataset.amount); return; }

  // ── Set value buttons (manual input) ──
  const setBtn = e.target.closest("[data-gm-action]");
  if (setBtn) { await handleGMSetValue(setBtn.dataset.gmAction); return; }

  // ── Booster set (manual input) ──
  const boosterSetBtn = e.target.closest("[data-gm-booster]");
  if (boosterSetBtn) { await handleGMBooster(boosterSetBtn.dataset.gmBooster, "set"); return; }

  // ── Booster clear ──
  const boosterClearBtn = e.target.closest("[data-gm-booster-clear]");
  if (boosterClearBtn) { await handleGMBooster(boosterClearBtn.dataset.gmBoosterClear, "clear"); return; }

  // ── Crate add (manual input) ──
  const crateAddBtn = e.target.closest("[data-gm-crate-add]");
  if (crateAddBtn) { await handleGMCrate(crateAddBtn.dataset.gmCrateAdd, "add"); return; }

  // ── Crate remove (manual input) ──
  const crateRemoveBtn = e.target.closest("[data-gm-crate-remove]");
  if (crateRemoveBtn) { await handleGMCrate(crateRemoveBtn.dataset.gmCrateRemove, "remove"); return; }
}

// ============================================================
// SECTION 5 — PLAYER LOOKUP
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
  gmMsg("gm-lookup-message", `✓ Found: ${result.nickname}`, true);
}

// ============================================================
// SECTION 6 — TARGET LEADERBOARD TOGGLE
// ============================================================

async function handleGMTargetLbToggle() {
  const target = window.__gmTarget;
  if (!target) return;

  gmMsg("gm-lookup-message", "Updating...", null);
  const result = await toggleLeaderboardVisibilityForPlayer(target.id);
  gmMsg("gm-lookup-message", result.message, result.success);

  if (result.success) {
    target.lbHidden = result.hidden;
    gmLog(
      "set",
      "fa-solid fa-eye" + (result.hidden ? "-slash" : ""),
      `<strong>${target.nickname}</strong> leaderboard → ${result.hidden ? "hidden" : "visible"}`
    );
    renderGMPanel();
  }
}

// ============================================================
// SECTION 7 — SET VALUES (manual input)
// ============================================================

const FIELD_MAP = {
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

const ACTION_LABELS = {
  cash: "Cash", shards: "Shards", ore: "Ore", level: "Player Level",
  xp: "XP", pickaxe: "Pickaxe Level", backpack: "Backpack Level",
  rebirths: "Rebirths", ptokens: "Prestige Tokens", cashearned: "Total Cash Earned",
};

function fmtNum(n) {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return String(n);
}

async function handleGMSetValue(action) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-message", "No player selected.", false); return; }

  const input = document.getElementById(`gm-input-${action}`);
  const value = input?.value?.trim();
  if (!value && value !== "0") { gmMsg("gm-message", "Enter a value first.", false); return; }

  const n = parseFloat(value);
  if (isNaN(n) || n < 0) { gmMsg("gm-message", "Invalid value.", false); return; }

  const field = FIELD_MAP[action];
  if (!field) return;

  const label = ACTION_LABELS[action] || action;
  const confirmed = await gmConfirm(
    `Set <strong>${label}</strong> to <strong>${fmtNum(Math.floor(n))}</strong> for <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-message", "Applying...", null);

  const patch  = { [field]: Math.floor(n) };
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-message", result.message, result.success);

  if (result.success) {
    if (input) input.value = "";
    if (result.merged) target.gameData = result.merged;
    else if (target.gameData) target.gameData[field] = Math.floor(n);
    gmLog("set", "fa-solid fa-sliders", `<strong>${target.nickname}</strong> — ${label} → <strong>${fmtNum(Math.floor(n))}</strong>`);
    renderGMPanel();
  }
}

// ============================================================
// SECTION 8 — QUICK SET (chip buttons for set values)
// ============================================================

async function handleGMQuickSet(action, rawValue) {
  const target = window.__gmTarget;
  if (!target) return;

  const n     = parseFloat(rawValue);
  const field = FIELD_MAP[action];
  const label = ACTION_LABELS[action] || action;
  if (!field || isNaN(n)) return;

  const confirmed = await gmConfirm(
    `Set <strong>${label}</strong> to <strong>${fmtNum(Math.floor(n))}</strong> for <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-message", "Applying...", null);

  const patch  = { [field]: Math.floor(n) };
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-message", result.message, result.success);

  if (result.success) {
    if (result.merged) target.gameData = result.merged;
    else if (target.gameData) target.gameData[field] = Math.floor(n);
    gmLog("set", "fa-solid fa-bolt-lightning", `<strong>${target.nickname}</strong> — ${label} → <strong>${fmtNum(Math.floor(n))}</strong>`);
    renderGMPanel();
  }
}

// ============================================================
// SECTION 9 — GM BUFFS / BOOSTERS (manual input)
// ============================================================

const BOOSTER_LABELS = {
  miningSpeed: "Mining Speed",
  sellValue:   "Sell Value",
  xpGain:      "XP Gain",
};

async function handleGMBooster(boosterKey, mode) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-booster-message", "No player selected.", false); return; }

  if (mode === "clear") {
    const confirmed = await gmConfirm(
      `Clear <strong>${BOOSTER_LABELS[boosterKey] || boosterKey}</strong> buff for <strong>${target.nickname}</strong>?`
    );
    if (!confirmed) return;

    const patch  = { boosters: { [boosterKey]: { multiplier: 1, endsAt: 0, isGm: false } } };
    gmMsg("gm-booster-message", "Clearing...", null);
    const result = await gmApplyToPlayer(target.id, patch, target.gameData);
    gmMsg("gm-booster-message", result.message, result.success);
    if (result.success) {
      if (result.merged) target.gameData = result.merged;
      gmLog("remove", "fa-solid fa-ban", `<strong>${target.nickname}</strong> — ${BOOSTER_LABELS[boosterKey] || boosterKey} buff cleared`);
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

  const confirmed = await gmConfirm(
    `Apply <strong>${BOOSTER_LABELS[boosterKey] || boosterKey}</strong> <strong>${mult}×</strong> for <strong>${mins}min</strong> to <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-booster-message", "Applying...", null);

  const patch  = buildBoosterPatch(boosterKey, mult, mins);
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-booster-message", result.message, result.success);

  if (result.success) {
    if (multInput) multInput.value = "";
    if (minsInput) minsInput.value = "";
    if (result.merged) target.gameData = result.merged;
    gmLog("boost", "fa-solid fa-bolt", `<strong>${target.nickname}</strong> — ${BOOSTER_LABELS[boosterKey] || boosterKey} ${mult}× for ${mins}min`);
    renderGMPanel();
    renderBoosterBadges();
    showToast(`GM Buff: ${BOOSTER_LABELS[boosterKey] || boosterKey} ${mult}× for ${mins}min`, "success", 3000);
  }
}

// ============================================================
// SECTION 10 — QUICK BOOST (chip buttons)
// ============================================================

async function handleGMQuickBoost(boosterKey, rawMult, rawMins) {
  const target = window.__gmTarget;
  if (!target) return;

  const mult = parseFloat(rawMult);
  const mins = parseFloat(rawMins);
  if (isNaN(mult) || isNaN(mins)) return;

  const confirmed = await gmConfirm(
    `Apply <strong>${BOOSTER_LABELS[boosterKey] || boosterKey}</strong> <strong>${mult}×</strong> for <strong>${mins}min</strong> to <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-booster-message", "Applying...", null);

  const patch  = buildBoosterPatch(boosterKey, mult, mins);
  const result = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-booster-message", result.message, result.success);

  if (result.success) {
    if (result.merged) target.gameData = result.merged;
    gmLog("boost", "fa-solid fa-bolt", `<strong>${target.nickname}</strong> — ${BOOSTER_LABELS[boosterKey] || boosterKey} ${mult}× for ${mins}min`);
    renderGMPanel();
    renderBoosterBadges();
    showToast(`GM Buff: ${BOOSTER_LABELS[boosterKey] || boosterKey} ${mult}× for ${mins}min`, "success", 3000);
  }
}

// ============================================================
// SECTION 11 — CRATE MANAGEMENT (manual input)
// ============================================================

async function handleGMCrate(crateId, mode) {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-crate-message", "No player selected.", false); return; }

  const amtInput = document.getElementById(`gm-crate-amt-${crateId}`);
  const amount   = amtInput?.value?.trim();

  if (!amount || amount === "0") { gmMsg("gm-crate-message", "Enter an amount (min 1).", false); return; }

  const n = parseInt(amount, 10);
  if (isNaN(n) || n < 1) { gmMsg("gm-crate-message", "Invalid amount.", false); return; }

  const verb = mode === "add" ? "Add" : "Remove";
  const confirmed = await gmConfirm(
    `${verb} <strong>${n}× ${crateId}</strong> crate${n > 1 ? "s" : ""} ${mode === "add" ? "to" : "from"} <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-crate-message", "Applying...", null);

  const currentCrates = target.gameData?.crates || {};
  const patch         = buildCratePatch(currentCrates, crateId, n, mode);
  const result        = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-crate-message", result.message, result.success);

  if (result.success) {
    if (amtInput) amtInput.value = "";
    if (result.merged) target.gameData = result.merged;
    gmLog(
      mode === "add" ? "crate" : "remove",
      mode === "add" ? "fa-solid fa-boxes-stacked" : "fa-solid fa-minus",
      `<strong>${target.nickname}</strong> — ${verb.toLowerCase()} ${n}× ${crateId} crate${n > 1 ? "s" : ""}`
    );
    renderGMPanel();
    showToast(`${verb}ed ${n}× ${crateId} crate${n > 1 ? "s" : ""}`, "success", 2500);
  }
}

// ============================================================
// SECTION 12 — QUICK CRATE ADD (chip buttons)
// ============================================================

async function handleGMQuickCrateAdd(crateId, rawAmount) {
  const target = window.__gmTarget;
  if (!target) return;

  const n = parseInt(rawAmount, 10);
  if (isNaN(n) || n < 1) return;

  const confirmed = await gmConfirm(
    `Add <strong>${n}× ${crateId}</strong> crate${n > 1 ? "s" : ""} to <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-crate-message", "Applying...", null);

  const currentCrates = target.gameData?.crates || {};
  const patch         = buildCratePatch(currentCrates, crateId, n, "add");
  const result        = await gmApplyToPlayer(target.id, patch, target.gameData);

  gmMsg("gm-crate-message", result.message, result.success);

  if (result.success) {
    if (result.merged) target.gameData = result.merged;
    gmLog("crate", "fa-solid fa-boxes-stacked", `<strong>${target.nickname}</strong> — add ${n}× ${crateId} crate${n > 1 ? "s" : ""}`);
    renderGMPanel();
    showToast(`Added ${n}× ${crateId} crate${n > 1 ? "s" : ""}`, "success", 2500);
  }
}

// ============================================================
// SECTION 13 — VIP MANAGEMENT
// ============================================================

async function handleGMGrantVip() {
  const target    = window.__gmTarget;
  const daysInput = document.getElementById("gm-vip-days");
  const days      = parseInt(daysInput?.value?.trim(), 10);

  if (!target) { gmMsg("gm-vip-message", "Look up a player first.", false); return; }
  if (!days || days < 1) { gmMsg("gm-vip-message", "Enter valid days (min 1).", false); return; }

  const confirmed = await gmConfirm(
    `Grant VIP for <strong>${days} day${days > 1 ? "s" : ""}</strong> to <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-vip-message", "Granting VIP...", null);
  const result = await grantVipByPlayerId(target.playerId, days);
  gmMsg("gm-vip-message", result.message, result.success);

  if (result.success) {
    if (daysInput) daysInput.value = "";
    gmLog("vip", "fa-solid fa-crown", `<strong>${target.nickname}</strong> — VIP granted for ${days} day${days > 1 ? "s" : ""}`);
  }
}

async function handleGMRevokeVip() {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-vip-message", "Look up a player first.", false); return; }

  const confirmed = await gmConfirm(
    `Revoke VIP from <strong>${target.nickname}</strong>?`
  );
  if (!confirmed) return;

  gmMsg("gm-vip-message", "Revoking...", null);
  const result = await revokeVipByPlayerId(target.playerId);
  gmMsg("gm-vip-message", result.message, result.success);

  if (result.success) {
    gmLog("vip", "fa-solid fa-ban", `<strong>${target.nickname}</strong> — VIP revoked`);
  }
}

async function handleGMCheckVip() {
  const target = window.__gmTarget;
  if (!target) { gmMsg("gm-vip-message", "Look up a player first.", false); return; }

  gmMsg("gm-vip-message", "Checking...", null);
  const result = await checkVipByPlayerId(target.playerId);
  gmMsg(
    "gm-vip-message",
    result.message,
    result.success ? (result.isVip ? true : null) : false
  );
}
