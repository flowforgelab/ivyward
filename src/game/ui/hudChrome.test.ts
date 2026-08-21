import { afterEach, describe, expect, it } from "vitest";
import {
  getHudChromeSnapshot,
  isCodexHudUnlocked,
  isRecipesHudUnlocked,
  resetHudChrome,
  setHudChromeFromSnapshot,
  unlockCodexHud,
  unlockRecipesHud,
  refreshHudChromeButtons,
} from "./hudChrome";
import { setInventoryFromSnapshot } from "../inventory/playerInventory";

describe("hudChrome", () => {
  afterEach(() => {
    resetHudChrome();
    setInventoryFromSnapshot({}, {});
    document.body.innerHTML = "";
  });

  it("starts locked", () => {
    expect(isCodexHudUnlocked()).toBe(false);
    expect(isRecipesHudUnlocked()).toBe(false);
  });

  it("unlocks codex and recipes sticky flags", () => {
    unlockCodexHud();
    unlockRecipesHud();
    expect(getHudChromeSnapshot()).toEqual({
      hudCodexUnlocked: true,
      hudRecipesUnlocked: true,
    });
  });

  it("unlocks recipes via unlockRecipesHud", () => {
    unlockRecipesHud();
    expect(isRecipesHudUnlocked()).toBe(true);
  });


  it("keeps explicit false locked despite legacy discoveries/materials", () => {
    setHudChromeFromSnapshot({
      hudCodexUnlocked: false,
      hudRecipesUnlocked: false,
      discoveredCreatures: ["mossling"],
      partyCount: 1,
      materials: { wood: 2 },
    });
    expect(isCodexHudUnlocked()).toBe(false);
    expect(isRecipesHudUnlocked()).toBe(false);
  });

  it("migrates older saves from discoveries and materials", () => {
    setHudChromeFromSnapshot({
      discoveredCreatures: ["mossling"],
      partyCount: 0,
      materials: { stone: 2 },
    });
    expect(isCodexHudUnlocked()).toBe(true);
    expect(isRecipesHudUnlocked()).toBe(true);
  });

  it("hides recipes/codex until unlocked and keeps overflow visible", () => {
    document.body.innerHTML = `
      <button id="recipes-btn"></button>
      <button id="codex-btn"></button>
      <button id="status-overflow-btn"></button>
      <div id="status-overflow-menu" hidden></div>
    `;
    refreshHudChromeButtons();
    expect(
      (document.getElementById("recipes-btn") as HTMLButtonElement).hidden,
    ).toBe(true);
    expect(
      (document.getElementById("codex-btn") as HTMLButtonElement).hidden,
    ).toBe(true);
    expect(
      (document.getElementById("status-overflow-btn") as HTMLButtonElement)
        .hidden,
    ).toBe(false);

    unlockCodexHud();
    unlockRecipesHud();
    expect(
      (document.getElementById("recipes-btn") as HTMLButtonElement).hidden,
    ).toBe(false);
    expect(
      (document.getElementById("codex-btn") as HTMLButtonElement).hidden,
    ).toBe(false);
  });
});
