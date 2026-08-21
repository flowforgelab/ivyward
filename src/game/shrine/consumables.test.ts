import { beforeEach, describe, expect, it } from "vitest";
import { playerParty } from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { LEVEL_XP_THRESHOLDS, MAX_LEVEL } from "../progression/leveling";
import {
  applyConsumable,
  getBrookCrystalCost,
  getEligibleCreaturesForConsumable,
} from "./consumables";

function partyMember(overrides: Partial<CreatureInstance> = {}): CreatureInstance {
  return {
    instanceId: "c-test",
    definitionId: "mossling",
    speciesId: "mossling",
    currentHp: 10,
    level: 4,
    xp: LEVEL_XP_THRESHOLDS[4],
    ...overrides,
  };
}

beforeEach(() => {
  playerParty.creatures.length = 0;
  playerParty.activeInstanceIds.length = 0;
  setInventoryFromSnapshot({}, {});
});

describe("Brook Crystal cost ladder", () => {
  it("scales 2 / 4 / 8 by level band", () => {
    expect(getBrookCrystalCost(1)).toBe(2);
    expect(getBrookCrystalCost(9)).toBe(2);
    expect(getBrookCrystalCost(10)).toBe(4);
    expect(getBrookCrystalCost(24)).toBe(4);
    expect(getBrookCrystalCost(25)).toBe(8);
    expect(getBrookCrystalCost(50)).toBe(8);
  });

  it("does not let 20 crystals buy 20 levels at any band", () => {
    expect(Math.floor(20 / getBrookCrystalCost(1))).toBeLessThan(20);
    expect(Math.floor(20 / getBrookCrystalCost(10))).toBeLessThan(20);
    expect(Math.floor(20 / getBrookCrystalCost(25))).toBeLessThan(20);
  });
});

describe("Brook Crystal use", () => {
  it("spends two crystals below L10 to grant one flat level and threshold XP", () => {
    const creature = partyMember();
    playerParty.creatures.push(creature);
    playerParty.activeInstanceIds.push(creature.instanceId);
    setInventoryFromSnapshot({}, { "brook-crystal": 2 });

    expect(applyConsumable(creature.instanceId, "brook-crystal")).toEqual({
      ok: true,
      message: "Mossling reached Lv.5.",
    });
    expect(creature.level).toBe(5);
    expect(creature.xp).toBe(LEVEL_XP_THRESHOLDS[5]);
    expect(getItemCount("brook-crystal")).toBe(0);
  });

  it("spends four crystals at L10–L24", () => {
    const creature = partyMember({
      level: 10,
      xp: LEVEL_XP_THRESHOLDS[10],
    });
    playerParty.creatures.push(creature);
    playerParty.activeInstanceIds.push(creature.instanceId);
    setInventoryFromSnapshot({}, { "brook-crystal": 4 });

    expect(applyConsumable(creature.instanceId, "brook-crystal")).toEqual({
      ok: true,
      message: "Mossling reached Lv.11.",
    });
    expect(creature.level).toBe(11);
    expect(getItemCount("brook-crystal")).toBe(0);
  });

  it("spends eight crystals at L25+", () => {
    const creature = partyMember({
      level: 25,
      xp: LEVEL_XP_THRESHOLDS[25],
    });
    playerParty.creatures.push(creature);
    playerParty.activeInstanceIds.push(creature.instanceId);
    setInventoryFromSnapshot({}, { "brook-crystal": 8 });

    expect(applyConsumable(creature.instanceId, "brook-crystal")).toEqual({
      ok: true,
      message: "Mossling reached Lv.26.",
    });
    expect(creature.level).toBe(26);
    expect(getItemCount("brook-crystal")).toBe(0);
  });

  it("refuses a member already at max level without spending crystals", () => {
    const creature = partyMember({
      level: MAX_LEVEL,
      xp: LEVEL_XP_THRESHOLDS[MAX_LEVEL],
    });
    playerParty.creatures.push(creature);
    playerParty.activeInstanceIds.push(creature.instanceId);
    setInventoryFromSnapshot({}, { "brook-crystal": 8 });

    expect(applyConsumable(creature.instanceId, "brook-crystal")).toEqual({
      ok: false,
      message: "Mossling is already at max level 50.",
    });
    expect(getItemCount("brook-crystal")).toBe(8);
  });

  it("refuses when crystals are below the band cost", () => {
    const creature = partyMember();
    playerParty.creatures.push(creature);
    playerParty.activeInstanceIds.push(creature.instanceId);
    setInventoryFromSnapshot({}, { "brook-crystal": 1 });

    expect(applyConsumable(creature.instanceId, "brook-crystal")).toEqual({
      ok: false,
      message: "You need 2 Brook Crystals.",
    });
    expect(creature.level).toBe(4);
    expect(getItemCount("brook-crystal")).toBe(1);
  });

  it("allows a fainted party member to gain a level", () => {
    const creature = partyMember({ currentHp: 0 });
    playerParty.creatures.push(creature);
    playerParty.activeInstanceIds.push(creature.instanceId);
    setInventoryFromSnapshot({}, { "brook-crystal": 2 });

    expect(
      getEligibleCreaturesForConsumable("brook-crystal"),
    ).toMatchObject([{ instanceId: creature.instanceId, eligible: true }]);
    expect(applyConsumable(creature.instanceId, "brook-crystal").ok).toBe(true);
    expect(creature.level).toBe(5);
    expect(creature.currentHp).toBe(0);
  });
});
