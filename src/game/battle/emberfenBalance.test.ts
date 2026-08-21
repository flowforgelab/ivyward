import { describe, expect, it } from "vitest";
import {
  applyDamage,
  isFainted,
  resolveAttack,
} from "../battle/battleLogic";
import { getCreatureDefinition } from "../creatures/catalog";
import {
  getEffectiveAttack,
  getEffectiveDefense,
  getEffectiveMaxHp,
} from "../creatures/party";
import type { BattleCombatant, CreatureInstance } from "../creatures/types";
import { rollWildLevel } from "../encounters/tables";

function instanceAt(
  definitionId: string,
  level: number,
): CreatureInstance {
  return {
    instanceId: `t-${definitionId}-${level}`,
    definitionId,
    speciesId: definitionId,
    currentHp: 0,
    level,
    xp: 0,
  };
}

function combatantFrom(definitionId: string, level: number): BattleCombatant {
  const def = getCreatureDefinition(definitionId);
  const creature = instanceAt(definitionId, level);
  const maxHp = getEffectiveMaxHp(creature);
  return {
    name: def.name,
    maxHp,
    currentHp: maxHp,
    attack: getEffectiveAttack(creature),
    defense: getEffectiveDefense(creature),
    moves: def.moves,
    folkloreType: def.folkloreType,
  };
}

/** Deterministic always-hit spar: both sides use move[0] until one faints. */
function spar(
  player: BattleCombatant,
  wild: BattleCombatant,
): { playerWon: boolean; playerHpRatio: number } {
  // Always roll accuracy success (rng * 100 < accuracy for accuracy>=100, and 0 works for lower).
  const hit = (): number => 0;
  while (true) {
    const playerMove = player.moves[0]!;
    const playerHit = resolveAttack(player, playerMove, wild, hit);
    if (playerHit.kind === "hit") {
      applyDamage(wild, playerHit.damage);
    }
    if (isFainted(wild)) {
      return {
        playerWon: true,
        playerHpRatio: player.currentHp / player.maxHp,
      };
    }
    const wildMove = wild.moves[0]!;
    const wildHit = resolveAttack(wild, wildMove, player, hit);
    if (wildHit.kind === "hit") {
      applyDamage(player, wildHit.damage);
    }
    if (isFainted(player)) {
      return {
        playerWon: false,
        playerHpRatio: 0,
      };
    }
  }
}

describe("Emberfen band balance (#263 AC5)", () => {
  it("level-1 party loses to an Emberfen-band peat-sprite", () => {
    const emberLevel = rollWildLevel("emberfen", undefined, () => 0); // min = 18
    expect(emberLevel).toBe(18);
    const player = combatantFrom("mossling", 1);
    const wild = combatantFrom("peat-sprite", emberLevel);
    const result = spar(player, wild);
    expect(result.playerWon).toBe(false);
  });

  it("on-curve party beats Emberfen wild while losing HP", () => {
    const emberLevel = rollWildLevel("emberfen", undefined, () => 0.999); // max = 24
    expect(emberLevel).toBe(24);
    // On-curve ≈ mid/high band for the zone.
    const player = combatantFrom("bramblewarden", 22);
    const wild = combatantFrom("peat-sprite", emberLevel);
    const result = spar(player, wild);
    expect(result.playerWon).toBe(true);
    expect(result.playerHpRatio).toBeLessThan(0.9);
    expect(result.playerHpRatio).toBeGreaterThan(0);
  });
});
