// ============================================================
// HANDLERS/PETS.JS — Pets panel event handlers
// ============================================================

import { doHunt, doFish } from "../pets.js";
import { showToast } from "../ui/ui-core.js";
import { renderPetsPanel } from "../ui/ui-pets.js";
import { renderHUD } from "../ui/ui-hud.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function bindPetEvents() {
  on("btn-hunt", "click", handleHunt);
  on("btn-fish", "click", handleFish);
}

function handleHunt() {
  const result = doHunt();
  if (!result.success) {
    showToast(result.message, "error", 2000);
    return;
  }

  const r = result.result;
  if (r.type === "pet" && r.isNew) {
    showToast(`Found a ${r.petData.name} (${r.petData.rarity})!`, "success", 4000);
  } else if (r.type === "duplicate") {
    showToast(`Already own ${r.petData.name}! Got ${r.shards} shards.`, "info", 3000);
  } else if (r.type === "shards") {
    showToast(`Hunt returned ${r.amount} shards.`, "info", 2000);
  } else {
    showToast("Nothing found this time...", "info", 2000);
  }

  renderPetsPanel();
  renderHUD();
}

function handleFish() {
  const result = doFish();
  if (!result.success) {
    showToast(result.message, "error", 2000);
    return;
  }
  showToast(result.message, "info", 2000);
  renderPetsPanel();
  renderHUD();
}
