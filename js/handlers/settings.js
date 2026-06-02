// ============================================================
// HANDLERS/SETTINGS.JS — Settings panel event handlers
// ============================================================

import { state } from "../state.js";
import { cloudSave } from "../supabase.js";
import { showToast, showModal } from "../ui/ui-core.js";

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

export function bindSettingsEvents() {
  on("btn-force-save", "click", handleForceSave);
  on("btn-reset-save", "click", handleResetSave);
}

async function handleForceSave() {
  if (state.isGuest) {
    showToast("❌ Cloud saves require a registered account. Register to keep your progress!", "error", 4000);
    return;
  }
  const result = await cloudSave();
  showToast(result.success ? "✅ Game saved!" : "⚠️ Saved locally only.", result.success ? "success" : "error", 2500);
}

function handleResetSave() {
  showModal({
    title:       "Delete Save Data?",
    message:     "This permanently wipes ALL your progress — cash, gear, pets, everything. This cannot be undone.",
    confirmText: "Delete Everything",
    cancelText:  "Cancel",
    onConfirm:   () => {
      localStorage.clear();
      showToast("Save data deleted. Reloading...", "info", 2000);
      setTimeout(() => location.reload(), 2000);
    },
  });
}
