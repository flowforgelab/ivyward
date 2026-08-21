import { getGateStatusText, getQuestHint, getQuestSummary } from "../story/questProgress";
import { getActiveSideQuestHint } from "../world/npcState";
import { getHostLabel, isVisitorMode } from "../world/worldSession";
import { resetHostGame } from "../world/worldSave";
import type { ZoneDefinition } from "../world/zoneTypes";
import { openCodex } from "./codex";
import { openParty } from "./partyPanel";
import { openInventory } from "./inventoryPanel";
import { openRecipes } from "./recipePanel";
import { renderPartyHpHud } from "./partyHpHud";
import "./partyHpHud.css";

let inviteFeedbackActive = false;
let inviteFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

function defaultSessionText(): string {
  return isVisitorMode() ? "Visitor mode — explore only" : "";
}

function hideHostInviteButton(): void {
  const copyInviteBtn = document.getElementById(
    "copy-invite-btn",
  ) as HTMLButtonElement | null;
  if (!copyInviteBtn) {
    return;
  }
  copyInviteBtn.hidden = true;
  copyInviteBtn.disabled = true;
}

/** Kept so callers compile; host invite chrome is off for this slice. */
export function setCopyInviteHandler(
  _handler: (() => void | Promise<void>) | null,
): void {
  hideHostInviteButton();
}

function defaultSessionColor(): string {
  return isVisitorMode() ? "#a8a8c8" : "#4d879d";
}

export function updateStatusPanel(zone: ZoneDefinition): void {
  hideHostInviteButton();
  const zoneEl = document.getElementById("status-zone");
  const questEl = document.getElementById("status-quest");
  const questHintEl = document.getElementById("status-quest-hint");
  const gateEl = document.getElementById("status-gate");
  const partyEl = document.getElementById("status-party");
  const sessionEl = document.getElementById("status-session");

  if (zoneEl) {
    zoneEl.textContent = isVisitorMode()
      ? `Visiting: ${getHostLabel()}`
      : zone.name;
  }
  if (questEl) {
    questEl.textContent = getQuestSummary();
  }
  if (questHintEl) {
    const villageAsk = getActiveSideQuestHint();
    const storyHint = getQuestHint();
    questHintEl.textContent = villageAsk
      ? `${storyHint} · ${villageAsk}`
      : storyHint;
  }
  if (gateEl) {
    gateEl.textContent = getGateStatusText();
  }
  if (partyEl) {
    renderPartyHpHud(partyEl);
  }
  if (sessionEl && !inviteFeedbackActive) {
    sessionEl.textContent = defaultSessionText();
    sessionEl.style.color = defaultSessionColor();
  }
}

export function refreshPartyStatusLine(): void {
  const partyEl = document.getElementById("status-party");
  if (partyEl) {
    renderPartyHpHud(partyEl);
  }
}

export function setInviteStatus(message: string, color: string): void {
  inviteFeedbackActive = true;
  if (inviteFeedbackTimer !== null) {
    clearTimeout(inviteFeedbackTimer);
    inviteFeedbackTimer = null;
  }
  const sessionEl = document.getElementById("status-session");
  if (sessionEl) {
    sessionEl.textContent = message;
    sessionEl.style.color = color;
  }
}

export function resetInviteStatus(): void {
  inviteFeedbackActive = false;
  if (inviteFeedbackTimer !== null) {
    clearTimeout(inviteFeedbackTimer);
    inviteFeedbackTimer = null;
  }
  const sessionEl = document.getElementById("status-session");
  if (sessionEl) {
    sessionEl.textContent = defaultSessionText();
    sessionEl.style.color = defaultSessionColor();
  }
}

/** Flash invite feedback, then restore the default session line. */
export function flashInviteStatus(
  message: string,
  color: string,
  durationMs = 2500,
): void {
  setInviteStatus(message, color);
  inviteFeedbackTimer = setTimeout(() => {
    inviteFeedbackTimer = null;
    resetInviteStatus();
  }, durationMs);
}

export function measureStatusPanelHeight(): number {
  const panel = document.getElementById("status-panel");
  return panel?.offsetHeight ?? 96;
}

export function measureStatusPanelWidth(): number {
  const panel = document.getElementById("status-panel");
  return panel?.offsetWidth ?? 240;
}

export function showManualInviteUrl(url: string): void {
  const box = document.getElementById("invite-url-box");
  const input = document.getElementById(
    "invite-url-input",
  ) as HTMLInputElement | null;
  if (!box || !input) {
    return;
  }
  input.value = url;
  box.hidden = false;
  // Select so mobile users can use the native copy affordance.
  input.focus();
  input.select();
  input.setSelectionRange(0, input.value.length);
  const panel = document.getElementById("status-panel");
  panel?.scrollTo({ top: 0, behavior: "smooth" });
}

export function hideManualInviteUrl(): void {
  const box = document.getElementById("invite-url-box");
  const input = document.getElementById(
    "invite-url-input",
  ) as HTMLInputElement | null;
  if (box) {
    box.hidden = true;
  }
  if (input) {
    input.value = "";
  }
}

let statusControlsInitialized = false;

export function initStatusPanelControls(): void {
  if (statusControlsInitialized) {
    return;
  }
  statusControlsInitialized = true;

  hideHostInviteButton();
  const copyInviteBtn = document.getElementById("copy-invite-btn");
  if (copyInviteBtn instanceof HTMLButtonElement) {
    copyInviteBtn.addEventListener("click", () => {
      // Host invite chrome is off; do not copy a join link.
    });
  }

  const resetBtn = document.getElementById("reset-game-btn");
  if (resetBtn) {
    resetBtn.hidden = isVisitorMode();
    resetBtn.addEventListener("click", () => {
      if (isVisitorMode()) {
        return;
      }
      const confirmed = window.confirm(
        "Reset your world? Party, quests, and progress will be cleared.",
      );
      if (confirmed) {
        resetHostGame();
      }
    });
  }

  const codexBtn = document.getElementById("codex-btn");
  if (codexBtn) {
    codexBtn.addEventListener("click", () => openCodex());
  }

  const partyBtn = document.getElementById("party-btn");
  if (partyBtn) {
    partyBtn.addEventListener("click", () => openParty());
  }

  const inventoryBtn = document.getElementById("inventory-btn");
  if (inventoryBtn) {
    inventoryBtn.addEventListener("click", () => openInventory());
  }

  const recipesBtn = document.getElementById("recipes-btn");
  if (recipesBtn) {
    recipesBtn.addEventListener("click", () => openRecipes());
  }

  const inviteDismiss = document.getElementById("invite-url-dismiss");
  if (inviteDismiss) {
    inviteDismiss.addEventListener("click", () => hideManualInviteUrl());
  }
}
