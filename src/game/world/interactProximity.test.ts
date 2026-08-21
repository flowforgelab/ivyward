import { describe, expect, it } from "vitest";
import {
  INTERACT_ADJACENCY,
  findNearbyDoor,
  isNearShrine,
} from "./interactProximity";
import { getZone } from "./zones";

describe("isNearShrine", () => {
  const shrine = getZone("shrine");

  it("is true on the altar and at Chebyshev 1, including diagonals", () => {
    expect(isNearShrine(shrine, 5, 5)).toBe(true);
    expect(isNearShrine(shrine, 4, 5)).toBe(true);
    expect(isNearShrine(shrine, 6, 6)).toBe(true);
    expect(INTERACT_ADJACENCY).toBe(1);
  });

  it("is false two tiles away or in a zone with no altar", () => {
    expect(isNearShrine(shrine, 7, 5)).toBe(false);
    expect(isNearShrine(shrine, 5, 7)).toBe(false);
    expect(isNearShrine(getZone("grove"), 5, 5)).toBe(false);
  });
});

describe("findNearbyDoor", () => {
  const village = getZone("village");

  it("finds a cottage door on its tile and from the adjacent cottage prop", () => {
    expect(findNearbyDoor(village, 2, 4)?.label).toBe("Warden's Cottage");
    expect(findNearbyDoor(village, 2, 3)?.label).toBe("Warden's Cottage");
    expect(findNearbyDoor(village, 7, 3)?.label).toBe("Weaver's Cottage");
    expect(findNearbyDoor(village, 6, 2)?.label).toBe("Weaver's Cottage");
    expect(findNearbyDoor(village, 2, 8)?.label).toBe("Hearthkeep Cottage");
    expect(findNearbyDoor(village, 2, 7)?.label).toBe("Hearthkeep Cottage");
  });

  it("hides when the player walks out of adjacency", () => {
    expect(findNearbyDoor(village, 5, 5)).toBeUndefined();
    expect(findNearbyDoor(getZone("grove"), 3, 7)).toBeUndefined();
  });
});
