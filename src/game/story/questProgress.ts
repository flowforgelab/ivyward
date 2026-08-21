import {
  isFirstIslandLanded,
  setOverworldUnlocked,
  worldState,
} from "../world/worldState";
import { isCodexComplete } from "../progression/achievements";
import { isVisitorMode } from "../world/worldSession";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import { QUEST_ORDER, QUESTS } from "./quests";
import type {
  QuestEvent,
  QuestId,
  QuestObjective,
  QuestStatus,
} from "./questTypes";

export const questProgress: Record<QuestId, QuestStatus> = {
  "first-befriend": "locked",
  "first-spar": "locked",
  "reach-village": "locked",
  "shrine-craft": "locked",
};

let lastCompletionMessage: string | null = null;

const STORY_QUEST_COUNT = QUEST_ORDER.length;

export function initQuestProgress(): void {
  if (questProgress["first-befriend"] === "locked") {
    questProgress["first-befriend"] = "active";
  }
}

export function restoreQuestProgress(
  saved: Record<QuestId, QuestStatus>,
): void {
  for (const id of QUEST_ORDER) {
    questProgress[id] = saved[id] ?? "locked";
  }
  if (!QUEST_ORDER.some((id) => questProgress[id] === "active")) {
    const next = QUEST_ORDER.find((id) => questProgress[id] !== "complete");
    if (next) {
      questProgress[next] = "active";
    }
  }
}

export function getActiveQuestId(): QuestId | null {
  return QUEST_ORDER.find((id) => questProgress[id] === "active") ?? null;
}


const POST_STORY_NEXT = {
  harbor: "Next: reach Moonwake Harbor",
  sail: "Next: sail east from East Landing",
  islands: "Next: explore the islands",
} as const;

/** Post-FTUE HUD Next while Story 4/4 is done and before first island landing. */
export function getPostStoryNext(): string | null {
  const done = QUEST_ORDER.every((id) => questProgress[id] === "complete");
  if (!done) {
    return null;
  }
  if (!worldState.discoveredZones.includes("harbor")) {
    return POST_STORY_NEXT.harbor;
  }
  if (!worldState.discoveredZones.includes("archipelago")) {
    return POST_STORY_NEXT.sail;
  }
  if (!isFirstIslandLanded()) {
    return POST_STORY_NEXT.islands;
  }
  return null;
}

export function getQuestSummary(): string {
  const activeId = getActiveQuestId();
  if (!activeId) {
    const post = getPostStoryNext();
    if (post) {
      return post;
    }
    const done = QUEST_ORDER.every((id) => questProgress[id] === "complete");
    return done ? "Story: complete" : "Story: —";
  }
  const index = QUEST_ORDER.indexOf(activeId) + 1;
  return `Story ${index}/${STORY_QUEST_COUNT}: ${QUESTS[activeId].title}`;
}

export function getQuestHint(): string {
  const activeId = getActiveQuestId();
  if (!activeId) {
    const done = QUEST_ORDER.every((id) => questProgress[id] === "complete");
    if (!done) {
      return "";
    }
    // While the post-Story Next chain occupies the story slot, keep the hint empty.
    if (getPostStoryNext()) {
      return "";
    }
    // Subtle nudge only — the codex reward is never named before it is earned.
    return isCodexComplete(worldState.discoveredCreatures)
      ? "All story beats finished — explore freely."
      : "All story beats finished — explore freely. Your codex still has blank pages.";
  }
  return `Next: ${QUESTS[activeId].hint}`;
}

export function consumeQuestToast(): string | null {
  const message = lastCompletionMessage;
  lastCompletionMessage = null;
  return message;
}

function objectiveMatches(objective: QuestObjective, event: QuestEvent): boolean {
  switch (objective.type) {
    case "enter_zone":
      return event.type === "enter_zone" && event.zoneId === objective.zoneId;
    case "befriend_creature":
      return event.type === "befriend_creature";
    case "win_spar":
      return event.type === "win_spar";
    case "craft_item":
      return event.type === "craft_item";
    default:
      return false;
  }
}

function activateNextQuest(completedId: QuestId): void {
  const index = QUEST_ORDER.indexOf(completedId);
  const next = QUEST_ORDER[index + 1];
  if (next && questProgress[next] === "locked") {
    questProgress[next] = "active";
  }
}

function completeQuest(questId: QuestId): void {
  const quest = QUESTS[questId];
  questProgress[questId] = "complete";
  lastCompletionMessage = `Quest complete: ${quest.title}`;

  if (quest.unlocksOverworld) {
    setOverworldUnlocked(true);
    lastCompletionMessage += " — Overworld gate opened!";
  }

  activateNextQuest(questId);
  notifyWorldChanged();
}

export function recordQuestEvent(event: QuestEvent): boolean {
  if (isVisitorMode()) {
    return false;
  }

  const activeId = getActiveQuestId();
  if (!activeId) {
    return false;
  }

  const quest = QUESTS[activeId];
  if (!objectiveMatches(quest.objective, event)) {
    return false;
  }

  completeQuest(activeId);
  return true;
}

export function getGateStatusText(): string {
  if (questProgress["first-spar"] === "complete") {
    return "Overworld gate: OPEN";
  }
  const sparIndex = QUEST_ORDER.indexOf("first-spar") + 1;
  return `Overworld gate: LOCKED (Story ${sparIndex}/${STORY_QUEST_COUNT})`;
}
