import { beforeEach, describe, expect, it } from "vitest";
import { setVisitorMode } from "../world/worldSession";
import {
  setDiscoveredZones,
  setFirstIslandLanded,
  setOverworldUnlocked,
  worldState,
} from "../world/worldState";
import {
  getActiveQuestId,
  getQuestHint,
  getQuestSummary,
  initQuestProgress,
  questProgress,
  recordQuestEvent,
  restoreQuestProgress,
} from "./questProgress";
import { QUEST_ORDER } from "./quests";
import type { QuestId, QuestStatus } from "./questTypes";

function lockedProgress(): Record<QuestId, QuestStatus> {
  return Object.fromEntries(
    QUEST_ORDER.map((id) => [id, "locked" as const]),
  ) as Record<QuestId, QuestStatus>;
}

describe("recordQuestEvent", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setOverworldUnlocked(false);
    restoreQuestProgress(lockedProgress());
    initQuestProgress();
  });

  it("advances first-befriend then activates first-spar", () => {
    expect(getActiveQuestId()).toBe("first-befriend");
    expect(recordQuestEvent({ type: "befriend_creature" })).toBe(true);
    expect(questProgress["first-befriend"]).toBe("complete");
    expect(questProgress["first-spar"]).toBe("active");
    expect(getActiveQuestId()).toBe("first-spar");
  });

  it("unlocks overworld when first-spar completes", () => {
    restoreQuestProgress({
      ...lockedProgress(),
      "first-befriend": "complete",
      "first-spar": "active",
    });
    expect(recordQuestEvent({ type: "win_spar" })).toBe(true);
    expect(questProgress["first-spar"]).toBe("complete");
    expect(worldState.overworldUnlocked).toBe(true);
    expect(getActiveQuestId()).toBe("reach-village");
  });

  it("ignores mismatched objectives", () => {
    expect(recordQuestEvent({ type: "win_spar" })).toBe(false);
    expect(questProgress["first-befriend"]).toBe("active");
  });

  it("blocks progression while visiting", () => {
    setVisitorMode(true);
    expect(recordQuestEvent({ type: "befriend_creature" })).toBe(false);
    expect(questProgress["first-befriend"]).toBe("active");
  });
});

describe("post-story HUD Next", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setOverworldUnlocked(true);
    setDiscoveredZones([]);
    setFirstIslandLanded(false, false);
    restoreQuestProgress({
      "first-befriend": "complete",
      "first-spar": "complete",
      "reach-village": "complete",
      "shrine-craft": "complete",
    });
  });

  it("shows Harbor Next immediately after Story 4/4", () => {
    expect(getQuestSummary()).toBe("Next: reach Moonwake Harbor");
    expect(getQuestHint()).toBe("");
  });

  it("advances to sail Next after Harbor is discovered", () => {
    setDiscoveredZones(["harbor"]);
    expect(getQuestSummary()).toBe("Next: sail east from East Landing");
  });

  it("advances to islands Next after Archipelago is discovered", () => {
    setDiscoveredZones(["harbor", "archipelago"]);
    expect(getQuestSummary()).toBe("Next: explore the islands");
  });

  it("clears the Next chain after first island landing", () => {
    setDiscoveredZones(["harbor", "archipelago"]);
    setFirstIslandLanded(true, false);
    expect(getQuestSummary()).toBe("Story: complete");
    expect(getQuestHint().startsWith("All story beats finished")).toBe(true);
  });

  it("persists chain progress via restore of zones and island flag", () => {
    setDiscoveredZones(["harbor"]);
    expect(getQuestSummary()).toBe("Next: sail east from East Landing");
    restoreQuestProgress({
      "first-befriend": "complete",
      "first-spar": "complete",
      "reach-village": "complete",
      "shrine-craft": "complete",
    });
    expect(getQuestSummary()).toBe("Next: sail east from East Landing");
  });

  it("leaves pre-4/4 Story N/4 display unchanged", () => {
    restoreQuestProgress({
      ...lockedProgress(),
      "first-befriend": "complete",
      "first-spar": "active",
    });
    expect(getQuestSummary()).toMatch(/^Story 2\/4:/);
    expect(getQuestHint().startsWith("Next:")).toBe(true);
  });
});
