import type { CreatureInstance } from "../creatures/types";

/** Linear term in the cumulative XP curve: 10*(L-1) + 2*(L-1)^2. */
export const XP_PER_LEVEL_STEP = 10;

/** Quadratic term coefficient in the cumulative XP curve. */
export const XP_CURVE_QUADRATIC = 2;

/** Total XP pool granted on a spar win (shared across active party). */
export const XP_PER_SPAR_WIN = 70;

export const MAX_LEVEL = 50;

/** Cumulative XP required to reach level L: 10*(L-1) + 2*(L-1)^2. */
export function cumulativeXpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return XP_PER_LEVEL_STEP * n + XP_CURVE_QUADRATIC * n * n;
}

/** Cumulative XP required to reach each level. */
export const LEVEL_XP_THRESHOLDS: Record<number, number> = Object.fromEntries(
  Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return [level, cumulativeXpForLevel(level)];
  }),
);

export function getLevelForXp(xp: number): number {
  let level = 1;
  for (let lv = MAX_LEVEL; lv >= 1; lv--) {
    if (xp >= LEVEL_XP_THRESHOLDS[lv]) {
      level = lv;
      break;
    }
  }
  return level;
}

/**
 * Keep a stored level when it exceeds the level XP implies (grandfathered
 * saves after a curve re-pace). Never demotes.
 */
export function clampLevelAgainstXp(storedLevel: number, xp: number): number {
  return Math.max(storedLevel, getLevelForXp(xp));
}

export function grantSparXp(
  creature: CreatureInstance,
  amount = XP_PER_SPAR_WIN,
): number {
  const prevLevel = creature.level;
  creature.xp += amount;
  // max(...) so grandfathered high levels are not demoted on the next win.
  creature.level = clampLevelAgainstXp(creature.level, creature.xp);
  return creature.level - prevLevel;
}

export function grantFlatLevel(creature: CreatureInstance): number {
  const newLevel = Math.min(MAX_LEVEL, creature.level + 1);
  if (newLevel === creature.level) {
    return 0;
  }
  creature.level = newLevel;
  creature.xp = LEVEL_XP_THRESHOLDS[newLevel];
  return 1;
}

export function createNewCreatureProgress(): Pick<CreatureInstance, "level" | "xp"> {
  return { level: 1, xp: 0 };
}
