// ============================================================
// HANDLERS/AUTH.JS — Auth handlers & delegated click events
// ============================================================

import { state } from "../state.js";
import { loginUser, registerUser, logoutUser } from "../auth.js";
import { cloudLoad, resolveConflict } from "../supabase.js";
import { loginAsGuest } from "../auth.js";
import { upgradePet } from "../economy.js";
import { openCrate, openAllOfType } from "../crates.js";
import { purchasePrestigeUpgrade } from "../prestige.js";
import { showToast, showModal } from "../ui/ui-core.js";
import { renderHUD } from "../ui/ui-hud.js";
import { renderMinePanel } from "../ui/ui-mine.js";
import { renderPetsPanel } from "../ui/ui-pets.js";
import { renderCratesPanel, animateCrateOpen } from "../ui/ui-crates.js";
import { renderPrestigePanel } from "../ui/ui-prestige.js";
import { renderSettingsPanel, showRegisterModal } from "../ui/ui-settings.js";

export function bindDelegatedEvents() {
  document.addEventListener("click", handleDelegatedClick);
}

export async function handleAuthChange(direction) {
  if (direction === "in") {
    const winner = await resolveConflict();
    if (winner === "cloud") await cloudLoad();
    renderHUD();
    renderSettingsPanel();
  } else {
    loginAsGuest();
    renderHUD();
    renderSettingsPanel();
  }
}

async function handleDelegatedClick(e) {
  if (e.target.id === "btn-show-register") {
    e.preventDefault();
    showRegisterModal();
    return;
  }

  if (e.target.id === "btn-close-register") {
    const modal = document.getElementById("register-modal");
    if (modal) modal.remove();
    return;
  }

  if (e.target.id === "btn-login") {
    await handleLogin();
    return;
  }

  if (e.target.id === "btn-register") {
    await handleRegister();
    return;
  }

  if (e.target.id === "btn-logout") {
    await handleLogout();
    return;
  }

  const dimBtn = e.target.closest("[data-dim]");
  if (dimBtn && !dimBtn.disabled) {
    const { switchDimension } = await import("../economy.js");
    const result = switchDimension(dimBtn.dataset.dim);
    if (result.success) {
      renderMinePanel();
      renderHUD();
      applyDimensionTheme(dimBtn.dataset.dim);
    }
    return;
  }

  const crateBtn = e.target.closest("[data-crate]:not([data-crate-all])");
  if (crateBtn && !crateBtn.disabled) {
    const result = openCrate(crateBtn.dataset.crate);
    animateCrateOpen(result);
    return;
  }

  const crateAllBtn = e.target.closest("[data-crate-all]");
  if (crateAllBtn && !crateAllBtn.disabled) {
    const results = openAllOfType(crateAllBtn.dataset.crateAll);
    const last    = results[results.length - 1];
    if (last) animateCrateOpen(last);
    showToast(`Opened ${results.length} crates!`, "success", 3000);
    renderCratesPanel();
    return;
  }

  const claimBtn = e.target.closest("[data-claim]");
  if (claimBtn && !claimBtn.disabled) {
    renderCratesPanel();
    return;
  }

  const petUpgradeBtn = e.target.closest("[data-pet-upgrade]");
  if (petUpgradeBtn) {
    const result = upgradePet(petUpgradeBtn.dataset.petUpgrade);
    showToast(result.message, result.success ? "success" : "error", 2000);
    renderPetsPanel();
    renderHUD();
    return;
  }

  const prestigeBtn = e.target.closest("[data-prestige-upgrade]");
  if (prestigeBtn && !prestigeBtn.disabled) {
    const result = purchasePrestigeUpgrade(prestigeBtn.dataset.prestigeUpgrade);
    showToast(result.message, result.success ? "success" : "error", 2000);
    renderPrestigePanel();
    renderHUD();
    return;
  }
}

async function handleLogin() {
  const email    = document.getElementById("input-login-email")?.value?.trim();
  const password = document.getElementById("input-login-password")?.value;
  const msgEl    = document.getElementById("login-message");

  if (!email || !password) {
    if (msgEl) msgEl.textContent = "Please enter your email and password.";
    return;
  }

  if (msgEl) msgEl.textContent = "Logging in...";

  const result = await loginUser(email, password);

  if (result.success) {
    showToast(result.message, "success", 3000);
    renderHUD();
    renderSettingsPanel();
  } else {
    if (msgEl) msgEl.textContent = result.message;
    showToast(result.message, "error", 3000);
  }
}

async function handleRegister() {
  const playerId  = document.getElementById("input-reg-playerid")?.value?.trim();
  const nickname  = document.getElementById("input-reg-nickname")?.value?.trim();
  const email     = document.getElementById("input-reg-email")?.value?.trim();
  const password  = document.getElementById("input-reg-password")?.value;
  const password2 = document.getElementById("input-reg-password2")?.value;
  const msgEl     = document.getElementById("register-message");

  if (!playerId || !nickname || !email || !password || !password2) {
    if (msgEl) msgEl.textContent = "Please fill in all fields.";
    return;
  }

  if (password !== password2) {
    if (msgEl) msgEl.textContent = "Passwords do not match.";
    return;
  }

  if (msgEl) msgEl.textContent = "Creating account...";

  const result = await registerUser(playerId, password, nickname, email);

  if (result.success) {
    showToast(result.message, "success", 6000);
    const modal = document.getElementById("register-modal");
    if (modal) modal.remove();
    renderHUD();
    renderSettingsPanel();
  } else {
    if (msgEl) msgEl.textContent = result.message;
  }
}

async function handleLogout() {
  showModal({
    title:       "Log Out?",
    message:     "Your progress is saved. You'll continue as a guest.",
    confirmText: "Log Out",
    cancelText:  "Cancel",
    onConfirm:   async () => {
      await logoutUser();
      showToast("Logged out.", "info", 2000);
      renderHUD();
      renderSettingsPanel();
    },
  });
}

function applyDimensionTheme(dimensionId) {
  document.body.className = document.body.className
    .replace(/\bdim-\S+/g, "")
    .trim();
  document.body.classList.add(`dim-${dimensionId}`);
}
