import { describe, expect, it } from "vitest";
import { ZONES } from "./zones";
import { TileType, type ZoneId } from "./zoneTypes";
import { ZONE_ENCOUNTERS } from "../encounters/tables";
import { getZoneNpcs } from "./npcs";
import { ZONE_PROPS } from "./zoneProps";
import { cottageFrame } from "./cottageWalls";
import { findNearbyDoor } from "./interactProximity";

const INTERIOR_IDS = (Object.keys(ZONES) as ZoneId[]).filter(
  (id) => ZONES[id].interior,
);

function isWalkable(zoneId: ZoneId, x: number, y: number): boolean {
  const zone = ZONES[zoneId];
  if (x < 0 || y < 0 || x >= zone.width || y >= zone.height) {
    return false;
  }
  const tile = zone.tiles[y][x];
  return tile === TileType.Floor || tile === TileType.OverworldGate || tile === TileType.Dock;
}

describe("cottage interiors", () => {
  it("adds three of them", () => {
    expect(INTERIOR_IDS).toHaveLength(3);
  });

  it("is a safe room with no wild encounters", () => {
    for (const id of INTERIOR_IDS) {
      expect(ZONE_ENCOUNTERS[id]).toEqual([]);
    }
  });

  it("houses exactly one villager each", () => {
    for (const id of INTERIOR_IDS) {
      expect(getZoneNpcs(id)).toHaveLength(1);
    }
  });

  it("gives each villager a unique sprite", () => {
    const keys = INTERIOR_IDS.flatMap((id) =>
      getZoneNpcs(id).map((npc) => npc.spriteKey),
    );
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
  });

  it("frames each cottage as a square floor with a south door", () => {
    const frame = cottageFrame(ZONES["warden-cottage"]);
    expect(frame).toEqual({
      floorX0: 1,
      floorY0: 1,
      floorX1: 5,
      floorY1: 5,
      doorX: 3,
    });
  });

  it("has no E-doors; the south opening is a walk-on exit", () => {
    for (const id of INTERIOR_IDS) {
      const interior = ZONES[id];
      expect(interior.doors).toBeUndefined();
      expect(findNearbyDoor(interior, 3, 6)).toBeUndefined();
      expect(findNearbyDoor(interior, 3, 5)).toBeUndefined();
      const exit = interior.transitions.find((t) => t.targetZone === "village");
      expect(exit).toMatchObject({ x: 3, y: 6 });
    }
  });
});

describe("village doors", () => {
  const village = ZONES.village;

  it("has one door per cottage", () => {
    expect(village.doors).toHaveLength(INTERIOR_IDS.length);
  });

  it("stands on a walkable village tile", () => {
    for (const door of village.doors ?? []) {
      expect(isWalkable("village", door.x, door.y)).toBe(true);
    }
  });

  it("drops the player on a walkable tile inside the cottage", () => {
    for (const door of village.doors ?? []) {
      expect(isWalkable(door.targetZone, door.targetX, door.targetY)).toBe(true);
    }
  });

  it("is not also a walk-on transition, so passing by never pulls you inside", () => {
    for (const door of village.doors ?? []) {
      const overlapping = village.transitions.some(
        (t) => t.x === door.x && t.y === door.y,
      );
      expect(overlapping).toBe(false);
    }
  });

  it("returns the player to the doorstep they entered from", () => {
    for (const door of village.doors ?? []) {
      const exit = ZONES[door.targetZone].transitions.find(
        (t) => t.targetZone === "village",
      );
      expect(exit).toBeDefined();
      expect({ x: exit!.targetX, y: exit!.targetY }).toEqual({
        x: door.x,
        y: door.y,
      });
    }
  });

  it("gives each cottage its own door", () => {
    const targets = (village.doors ?? []).map((door) => door.targetZone);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("does not put hearths in the village square", () => {
    expect(ZONE_PROPS.village?.some((prop) => prop.kind === "hearth")).toBe(false);
  });
});
