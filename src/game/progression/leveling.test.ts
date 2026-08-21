import { describe, expect, it } from "vitest";
import type { CreatureInstance } from "../creatures/types";
import {
  clampLevelAgainstXp,
  createNewCreatureProgress,
  cumulativeXpForLevel,
  getLevelForXp,
  grantSparXp,
  LEVEL_XP_THRESHOLDS,
  MAX_LEVEL,
  XP_PER_LEVEL_STEP,
  XP_PER_SPAR_WIN,
} from "./leveling";

function creatureAt(level: number, xp: number): CreatureInstance {
  return {
    instanceId: "c-test",
    definitionId: "mossling",
    speciesId: "mossling",
    currentHp: 10,
    level,
    xp,
  };
}

describe("leveling", () => {
  it("uses the A2 cumulative curve 10*(L-1)+2*(L-1)^2", () => {
    expect(MAX_LEVEL).toBe(50);
    expect(XP_PER_LEVEL_STEP).toBe(10);
    expect(XP_PER_SPAR_WIN).toBe(70);
    expect(LEVEL_XP_THRESHOLDS[1]).toBe(0);
    expect(LEVEL_XP_THRESHOLDS[10]).toBe(252);
    expect(LEVEL_XP_THRESHOLDS[25]).toBe(1392);
    expect(LEVEL_XP_THRESHOLDS[50]).toBe(5292);
    expect(cumulativeXpForLevel(10)).toBe(252);
    expect(cumulativeXpForLevel(25)).toBe(1392);
    expect(cumulativeXpForLevel(50)).toBe(5292);
    expect(Object.keys(LEVEL_XP_THRESHOLDS)).toHaveLength(50);
  });

  it("maps xp to levels on the re-paced curve", () => {
    expect(getLevelForXp(251)).toBe(9);
    expect(getLevelForXp(252)).toBe(10);
    expect(getLevelForXp(1391)).toBe(24);
    expect(getLevelForXp(1392)).toBe(25);
    expect(getLevelForXp(5292)).toBe(50);
    expect(getLevelForXp(9999)).toBe(50);
    // Old linear L50 threshold no longer reaches max under the new curve.
    expect(getLevelForXp(490)).toBeLessThan(MAX_LEVEL);
  });

  it("grants spar xp and levels up when XP crosses the next threshold", () => {
    const creature = creatureAt(9, LEVEL_XP_THRESHOLDS[9]);
    const need = LEVEL_XP_THRESHOLDS[10] - creature.xp;
    const gained = grantSparXp(creature, need);
    expect(gained).toBe(1);
    expect(creature.xp).toBe(LEVEL_XP_THRESHOLDS[10]);
    expect(creature.level).toBe(10);
  });

  it("does not level past max from spar xp", () => {
    const creature = creatureAt(50, LEVEL_XP_THRESHOLDS[50]);
    const gained = grantSparXp(creature, XP_PER_SPAR_WIN * 10);
    expect(gained).toBe(0);
    expect(creature.level).toBe(50);
    expect(creature.xp).toBe(LEVEL_XP_THRESHOLDS[50] + XP_PER_SPAR_WIN * 10);
  });

  it("keeps a grandfathered level above XP-implied level on spar grant", () => {
    // Old linear L50 / 490 XP would imply a much lower level on the new curve.
    const creature = creatureAt(50, 490);
    expect(getLevelForXp(490)).toBeLessThan(50);
    expect(clampLevelAgainstXp(50, 490)).toBe(50);

    const gained = grantSparXp(creature, XP_PER_SPAR_WIN);
    expect(gained).toBe(0);
    expect(creature.level).toBe(50);
    expect(creature.xp).toBe(490 + XP_PER_SPAR_WIN);
  });

  it("does not reach MAX_LEVEL after 30 spar wins from level 1", () => {
    const creature = creatureAt(1, 0);
    for (let i = 0; i < 30; i++) {
      grantSparXp(creature, XP_PER_SPAR_WIN);
    }
    expect(creature.xp).toBe(30 * XP_PER_SPAR_WIN);
    expect(creature.level).toBeLessThan(MAX_LEVEL);
    expect(creature.level).toBe(getLevelForXp(creature.xp));
  });

  it("starts new creatures at level 1", () => {
    expect(createNewCreatureProgress()).toEqual({ level: 1, xp: 0 });
  });
});
