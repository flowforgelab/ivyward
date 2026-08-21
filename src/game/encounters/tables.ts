import { ISLAND_COLS, ISLAND_ROWS } from "../world/archipelagoStream";
import type { ZoneId } from "../world/zoneTypes";

type EncounterEntry = { id: string; weight: number };

export const ENCOUNTER_TRAVEL_THRESHOLD = 0.75;

/**
 * One exclusive on-foot creature per archipelago island (index 0..15).
 * Islands 0–2 reuse the original three; 3–15 are island-exclusive species.
 * Sailing never rolls these — IsometricScene skips encounters while isSailing().
 */
export const ARCHIPELAGO_ISLAND_CREATURE_IDS = [
  "isle-fernling",
  "salt-scuttle",
  "shoal-wisp",
  "tide-urchin",
  "coral-skitter",
  "drift-kelpie",
  "dune-hermit",
  "brackish-newt",
  "pearl-moth",
  "reef-spinner",
  "mist-anemone",
  "barnacle-toad",
  "gulf-lantern",
  "spray-finch",
  "lagoon-hare",
  "atoll-wisp",
] as const;

const ARCHIPELAGO_ISLAND_COUNT = ISLAND_ROWS * ISLAND_COLS;

if (ARCHIPELAGO_ISLAND_CREATURE_IDS.length !== ARCHIPELAGO_ISLAND_COUNT) {
  throw new Error(
    `Archipelago creature map length ${ARCHIPELAGO_ISLAND_CREATURE_IDS.length} !== island count ${ARCHIPELAGO_ISLAND_COUNT}`,
  );
}

/** Exclusive creature id for island index 0..15. */
export function creatureIdForIslandIndex(index: number): string {
  const id = ARCHIPELAGO_ISLAND_CREATURE_IDS[index];
  if (id === undefined) {
    throw new Error(`No creature for island index ${index}`);
  }
  return id;
}

const ARCHIPELAGO_EXCLUSIVE_IDS: string[] = [...ARCHIPELAGO_ISLAND_CREATURE_IDS];

/**
 * Habitats = encounter pools only.
 * Signature / immunity-capable species use late zones + low weight.
 */
export const ZONE_ENCOUNTERS: Record<ZoneId, EncounterEntry[]> = {
  grove: [
    { id: "mossling", weight: 70 },
    { id: "ember-wisp", weight: 30 },
  ],
  shrine: [
    { id: "ember-wisp", weight: 50 },
    { id: "brook-nymph", weight: 50 },
  ],
  village: [
    { id: "brook-nymph", weight: 60 },
    { id: "mossling", weight: 40 },
  ],
  // Late-game only — not in grove/shrine/village tables.
  overworld: [
    { id: "rootwalker", weight: 50 },
    { id: "lantern-fox", weight: 12 },
    { id: "stone-hound", weight: 10 },
  ],
  // Harbor shell: no wild table yet (boat/side-scroll follow-ups).
  harbor: [],
  // Union of per-island exclusives for codex habitat discovery.
  // Per-island rolls use creatureIdForIslandIndex via rollWildCreature.
  archipelago: ARCHIPELAGO_EXCLUSIVE_IDS.map((id) => ({ id, weight: 1 })),
  mistwood: [
    { id: "thunder-finch", weight: 70 },
    { id: "lantern-fox", weight: 10 },
    { id: "mist-serpent", weight: 8 },
  ],
  emberfen: [
    { id: "peat-sprite", weight: 45 },
    { id: "cinder-toad", weight: 40 },
    { id: "bog-lantern", weight: 12 },
  ],
  // Cottage interiors are safe rooms: no wild creatures, no codex habitat.
  "warden-cottage": [],
  "weaver-cottage": [],
  "hearthkeep-cottage": [],
};

function rollFromTable(table: EncounterEntry[]): string | null {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) {
    return table[0]?.id ?? null;
  }
  let roll = Math.random() * total;

  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.id;
    }
  }

  return table[0]?.id ?? null;
}

export type RollWildOptions = {
  /** Island index when rolling in the archipelago zone. Required for a hit. */
  islandIndex?: number | null;
};

/**
 * Inclusive wild level bands per habitat (#263 / #196 Section B).
 * Archipelago uses `8 + islandIndex` instead of a min/max band.
 */
export const WILD_LEVEL_BANDS: Partial<
  Record<ZoneId, Readonly<{ min: number; max: number }>>
> = {
  grove: { min: 1, max: 2 },
  shrine: { min: 2, max: 3 },
  village: { min: 3, max: 5 },
  overworld: { min: 8, max: 14 },
  mistwood: { min: 14, max: 20 },
  emberfen: { min: 18, max: 24 },
};

/**
 * Roll a wild combatant level for the zone. Archipelago is fixed at
 * `8 + islandIndex`. Zones without a band (harbor / cottages) return 1.
 */
export function rollWildLevel(
  zoneId: ZoneId,
  options?: RollWildOptions,
  rng: () => number = Math.random,
): number {
  if (zoneId === "archipelago") {
    const index = options?.islandIndex;
    if (index == null || index < 0 || index >= ARCHIPELAGO_ISLAND_COUNT) {
      return 1;
    }
    return 8 + index;
  }
  const band = WILD_LEVEL_BANDS[zoneId];
  if (!band) {
    return 1;
  }
  const span = band.max - band.min;
  return band.min + Math.floor(rng() * (span + 1));
}

/** Wild rolls only while on foot — sailing never attempts encounters. */
export function shouldAttemptWildEncounter(sailing: boolean): boolean {
  return !sailing;
}

export function rollWildCreature(
  zoneId: ZoneId,
  options?: RollWildOptions,
): string | null {
  if (zoneId === "archipelago") {
    // Island index is knowable from the Floor/Dock tile; missing ⇒ no roll
    // (open water / mid-sail must not hit the habitat union).
    const index = options?.islandIndex;
    if (index == null || index < 0 || index >= ARCHIPELAGO_ISLAND_COUNT) {
      return null;
    }
    return creatureIdForIslandIndex(index);
  }
  return rollFromTable(ZONE_ENCOUNTERS[zoneId]);
}

export function getCreaturesForZone(zoneId: ZoneId): string[] {
  return ZONE_ENCOUNTERS[zoneId].map((e) => e.id);
}

/** Habitats whose encounter table includes this creature. */
export function getHabitatsForCreature(creatureId: string): ZoneId[] {
  return (Object.keys(ZONE_ENCOUNTERS) as ZoneId[]).filter((zoneId) =>
    ZONE_ENCOUNTERS[zoneId].some((entry) => entry.id === creatureId),
  );
}

/** Creatures known in a habitat after encounter discoveries. */
export function getKnownCreaturesForZone(
  zoneId: ZoneId,
  discoveredCreatureIds: ReadonlySet<string>,
): string[] {
  return getCreaturesForZone(zoneId).filter((id) =>
    discoveredCreatureIds.has(id),
  );
}

/** Archipelago exclusive species ids (on-foot island encounters only). */
export function getArchipelagoExclusiveIds(): string[] {
  return [...ARCHIPELAGO_EXCLUSIVE_IDS];
}
