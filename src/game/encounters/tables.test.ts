import { describe, expect, it } from "vitest";
import {
  ARCHIPELAGO_ISLAND_CREATURE_IDS,
  creatureIdForIslandIndex,
  getArchipelagoExclusiveIds,
  getCreaturesForZone,
  getHabitatsForCreature,
  getKnownCreaturesForZone,
  rollWildCreature,
  rollWildLevel,
  shouldAttemptWildEncounter,
  WILD_LEVEL_BANDS,
  ZONE_ENCOUNTERS,
} from "./tables";
import type { ZoneId } from "../world/zoneTypes";
import { ISLAND_COLS, ISLAND_ROWS } from "../world/archipelagoStream";
import { getCreatureDefinition } from "../creatures/catalog";
import { getMaterialForCreature } from "../inventory/materials";
import {
  getEffectiveAttack,
  getEffectiveMaxHp,
} from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";
import {
  CAIRN_SOVEREIGN_ATTACK_PATTERN,
  CAIRN_SOVEREIGN_ID,
} from "./godLand";
import {
  TIDE_SOVEREIGN_ATTACK_PATTERN,
  TIDE_SOVEREIGN_ID,
} from "./godSail";

describe("getHabitatsForCreature", () => {
  it("lists every habitat that can spawn the creature", () => {
    expect(getHabitatsForCreature("ember-wisp").sort()).toEqual([
      "grove",
      "shrine",
    ]);
    expect(getHabitatsForCreature("mossling").sort()).toEqual([
      "grove",
      "village",
    ]);
  });

  it("returns empty for unknown ids", () => {
    expect(getHabitatsForCreature("not-a-creature")).toEqual([]);
  });

  it("registers archipelago exclusives under the archipelago habitat", () => {
    for (const id of getArchipelagoExclusiveIds()) {
      expect(getHabitatsForCreature(id)).toEqual(["archipelago"]);
    }
  });
});

describe("getKnownCreaturesForZone", () => {
  it("only returns discovered species for that habitat", () => {
    const discovered = new Set(["ember-wisp"]);
    expect(getKnownCreaturesForZone("grove", discovered)).toEqual([
      "ember-wisp",
    ]);
    expect(getKnownCreaturesForZone("shrine", discovered)).toEqual([
      "ember-wisp",
    ]);
    expect(getKnownCreaturesForZone("village", discovered)).toEqual([]);
  });
});

describe("archipelago exclusive encounters", () => {
  it("suppresses wild rolls while sailing and allows them on foot", () => {
    expect(shouldAttemptWildEncounter(true)).toBe(false);
    expect(shouldAttemptWildEncounter(false)).toBe(true);
  });

  it("maps each island index to a unique creature", () => {
    const islandCount = ISLAND_ROWS * ISLAND_COLS;
    expect(ARCHIPELAGO_ISLAND_CREATURE_IDS).toHaveLength(islandCount);
    const ids = ARCHIPELAGO_ISLAND_CREATURE_IDS.map((_, i) =>
      creatureIdForIslandIndex(i),
    );
    expect(new Set(ids).size).toBe(islandCount);
    expect(creatureIdForIslandIndex(0)).toBe("isle-fernling");
    expect(creatureIdForIslandIndex(1)).toBe("salt-scuttle");
    expect(creatureIdForIslandIndex(2)).toBe("shoal-wisp");
  });

  it("lists exclusive ids only in the archipelago zone table", () => {
    const exclusive = new Set(getArchipelagoExclusiveIds());
    expect(exclusive.size).toBe(ISLAND_ROWS * ISLAND_COLS);

    for (const [zoneId, table] of Object.entries(ZONE_ENCOUNTERS) as [
      ZoneId,
      { id: string; weight: number }[],
    ][]) {
      for (const entry of table) {
        if (exclusive.has(entry.id)) {
          expect(zoneId).toBe("archipelago");
        }
      }
    }

    expect(getCreaturesForZone("archipelago").sort()).toEqual(
      [...exclusive].sort(),
    );
  });

  it("rolls the island creature for every island index", () => {
    for (let i = 0; i < ARCHIPELAGO_ISLAND_CREATURE_IDS.length; i++) {
      expect(rollWildCreature("archipelago", { islandIndex: i })).toBe(
        creatureIdForIslandIndex(i),
      );
    }
  });

  it("returns null for archipelago without an island (no open-water exclusives)", () => {
    expect(rollWildCreature("archipelago")).toBeNull();
    expect(rollWildCreature("archipelago", { islandIndex: null })).toBeNull();
    expect(rollWildCreature("archipelago", { islandIndex: -1 })).toBeNull();
    expect(rollWildCreature("archipelago", { islandIndex: 99 })).toBeNull();
  });

  it("keeps island creatures in catalog with material drops", () => {
    for (const id of ARCHIPELAGO_ISLAND_CREATURE_IDS) {
      expect(getCreatureDefinition(id).id).toBe(id);
      expect(getMaterialForCreature(id)).toBeTruthy();
    }
  });
});

describe("wild level bands (#263)", () => {
  it("draws inclusive levels from each habitat band", () => {
    const cases: Array<[ZoneId, number, number]> = [
      ["grove", 1, 2],
      ["shrine", 2, 3],
      ["village", 3, 5],
      ["overworld", 8, 14],
      ["mistwood", 14, 20],
      ["emberfen", 18, 24],
    ];
    for (const [zoneId, min, max] of cases) {
      expect(WILD_LEVEL_BANDS[zoneId]).toEqual({ min, max });
      expect(rollWildLevel(zoneId, undefined, () => 0)).toBe(min);
      expect(rollWildLevel(zoneId, undefined, () => 0.999)).toBe(max);
    }
  });

  it("sets archipelago level to 8 + islandIndex", () => {
    expect(rollWildLevel("archipelago", { islandIndex: 0 })).toBe(8);
    expect(rollWildLevel("archipelago", { islandIndex: 15 })).toBe(23);
    expect(rollWildLevel("archipelago", { islandIndex: 0 })).not.toBe(
      rollWildLevel("archipelago", { islandIndex: 15 }),
    );
  });

  it("makes Emberfen wilds stronger than grove wilds for the same species", () => {
    const species = "peat-sprite";
    const groveLevel = rollWildLevel("grove", undefined, () => 0);
    const emberLevel = rollWildLevel("emberfen", undefined, () => 0);
    const asLevel = (level: number): CreatureInstance => ({
      instanceId: "w",
      definitionId: species,
      speciesId: species,
      currentHp: 0,
      level,
      xp: 0,
    });
    expect(emberLevel).toBeGreaterThan(groveLevel);
    expect(getEffectiveAttack(asLevel(emberLevel))).toBeGreaterThan(
      getEffectiveAttack(asLevel(groveLevel)),
    );
    expect(getEffectiveMaxHp(asLevel(emberLevel))).toBeGreaterThan(
      getEffectiveMaxHp(asLevel(groveLevel)),
    );
  });
});

describe("sovereign encounter patterns (#263 AC4)", () => {
  it("keeps Tide/Cairn fixed attack damage pattern", () => {
    expect(TIDE_SOVEREIGN_ATTACK_PATTERN.map((a) => a.damage)).toEqual([
      10, 15, 10, 20,
    ]);
    expect(CAIRN_SOVEREIGN_ATTACK_PATTERN.map((a) => a.damage)).toEqual([
      10, 15, 10, 20,
    ]);
    // Catalog bases used when BattleScene builds sovereign combatants (no level term).
    expect(getCreatureDefinition(TIDE_SOVEREIGN_ID).attack).toBe(16);
    expect(getCreatureDefinition(CAIRN_SOVEREIGN_ID).attack).toBe(14);
  });
});
