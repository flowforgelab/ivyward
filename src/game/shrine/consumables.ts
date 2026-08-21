import { getCreatureDefinition } from "../creatures/catalog";
import {
  getCreatureInstance,
  getEffectiveMaxHp,
  playerParty,
} from "../creatures/party";
import { consumeItem, getItemCount } from "../inventory/playerInventory";
import { grantFlatLevel, MAX_LEVEL } from "../progression/leveling";
import { refreshPartyStatusLine } from "../ui/statusPanel";

export type ConsumableEffectType = "heal" | "revive" | "level";

type HpConsumableDefinition = {
  itemId: string;
  effectType: "heal" | "revive";
  /** Fraction of effective max HP restored or revived to. */
  hpFraction: number;
};

type LevelConsumableDefinition = {
  itemId: string;
  effectType: "level";
};

export type ConsumableDefinition =
  | HpConsumableDefinition
  | LevelConsumableDefinition;

export const CONSUMABLE_ITEMS: ConsumableDefinition[] = [
  { itemId: "brook-tonic", effectType: "heal", hpFraction: 0.5 },
  { itemId: "moonwake-draught", effectType: "revive", hpFraction: 0.5 },
  { itemId: "brook-crystal", effectType: "level" },
];

/** A3 option (ii): 2 below L10, 4 below L25, 8 at L25+. */
export function getBrookCrystalCost(level: number): number {
  if (level < 10) return 2;
  if (level < 25) return 4;
  return 8;
}

export const FUSION_ITEM_IDS = [
  "sovereign-seal",
  "ember-charm",
  "moss-salve",
] as const;

export const CONSUMABLE_ITEM_IDS = CONSUMABLE_ITEMS.map((c) => c.itemId);

const byItemId = new Map(CONSUMABLE_ITEMS.map((c) => [c.itemId, c]));

export function getConsumable(itemId: string): ConsumableDefinition | undefined {
  return byItemId.get(itemId);
}

export function isConsumableItem(itemId: string): boolean {
  return byItemId.has(itemId);
}

export type ConsumableResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function canUseConsumableOn(
  creature: { currentHp: number; level: number },
  consumable: ConsumableDefinition,
  maxHp: number,
): boolean {
  if (consumable.effectType === "heal") {
    return creature.currentHp > 0 && creature.currentHp < maxHp;
  }
  if (consumable.effectType === "revive") {
    return creature.currentHp <= 0;
  }
  return creature.level < MAX_LEVEL;
}

export function applyConsumable(
  instanceId: string,
  itemId: string,
): ConsumableResult {
  const consumable = getConsumable(itemId);
  if (!consumable) {
    return { ok: false, message: "That item cannot be used here." };
  }

  const creature = getCreatureInstance(instanceId);
  if (!creature) {
    return { ok: false, message: "Creature not found." };
  }

  const def = getCreatureDefinition(creature.definitionId);
  const maxHp = getEffectiveMaxHp(creature);
  if (!canUseConsumableOn(creature, consumable, maxHp)) {
    if (consumable.effectType === "heal") {
      if (creature.currentHp <= 0) {
        return { ok: false, message: "Cannot heal a fainted creature." };
      }
      return { ok: false, message: "Creature is already at full health." };
    }
    if (consumable.effectType === "revive") {
      return { ok: false, message: "Creature is not fainted." };
    }
    return {
      ok: false,
      message: `${def.name} is already at max level ${MAX_LEVEL}.`,
    };
  }

  const itemCost =
    consumable.effectType === "level"
      ? getBrookCrystalCost(creature.level)
      : 1;
  if (getItemCount(itemId) < itemCost) {
    return consumable.effectType === "level"
      ? {
          ok: false,
          message: `You need ${itemCost} Brook Crystals.`,
        }
      : { ok: false, message: "You don't have that item." };
  }
  if (!consumeItem(itemId, itemCost)) {
    return { ok: false, message: "Could not use that item." };
  }

  if (consumable.effectType === "level") {
    grantFlatLevel(creature);
    refreshPartyStatusLine();
    return {
      ok: true,
      message: `${def.name} reached Lv.${creature.level}.`,
    };
  }

  const amount = Math.max(1, Math.floor(maxHp * consumable.hpFraction));

  if (consumable.effectType === "heal") {
    const before = creature.currentHp;
    creature.currentHp = Math.min(maxHp, creature.currentHp + amount);
    const gained = creature.currentHp - before;
    refreshPartyStatusLine();
    return {
      ok: true,
      message: `${def.name} recovered ${gained} HP (${creature.currentHp}/${maxHp}).`,
    };
  }

  creature.currentHp = amount;
  refreshPartyStatusLine();
  return {
    ok: true,
    message: `${def.name} was revived (${creature.currentHp}/${maxHp} HP).`,
  };
}

export function getEligibleCreaturesForConsumable(itemId: string): {
  instanceId: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  eligible: boolean;
  reason?: string;
}[] {
  const consumable = getConsumable(itemId);
  if (!consumable) {
    return [];
  }

  return playerParty.creatures.map((creature) => {
    const def = getCreatureDefinition(creature.definitionId);
    const maxHp = getEffectiveMaxHp(creature);
    const eligible = canUseConsumableOn(creature, consumable, maxHp);
    let reason: string | undefined;
    if (!eligible) {
      if (consumable.effectType === "heal") {
        reason =
          creature.currentHp <= 0
            ? "Fainted"
            : creature.currentHp >= maxHp
              ? "Full HP"
              : undefined;
      } else if (consumable.effectType === "revive") {
        reason = "Not fainted";
      } else {
        reason = `Max level ${MAX_LEVEL}`;
      }
    }
    return {
      instanceId: creature.instanceId,
      name: def.name,
      level: creature.level,
      currentHp: creature.currentHp,
      maxHp,
      eligible,
      reason,
    };
  });
}
