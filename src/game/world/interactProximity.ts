import type { ZoneDefinition, ZoneDoor } from "./zoneTypes";

/** Chebyshev range shared with villagers, gather, and cottage minigames (#187). */
export const INTERACT_ADJACENCY = 1;

export function chebyshevDist(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function isNearShrine(
  zone: ZoneDefinition,
  tileX: number,
  tileY: number,
): boolean {
  const shrine = zone.shrineInteract;
  if (!shrine) {
    return false;
  }
  return chebyshevDist(shrine.x, shrine.y, tileX, tileY) <= INTERACT_ADJACENCY;
}

export function findNearbyDoor(
  zone: ZoneDefinition,
  tileX: number,
  tileY: number,
): ZoneDoor | undefined {
  let best: { door: ZoneDoor; dist: number } | undefined;
  for (const door of zone.doors ?? []) {
    const dist = chebyshevDist(door.x, door.y, tileX, tileY);
    if (dist > INTERACT_ADJACENCY) {
      continue;
    }
    if (!best || dist < best.dist) {
      best = { door, dist };
    }
  }
  return best?.door;
}
