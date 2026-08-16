import {
  applyWorldSnapshot,
  exportWorldSnapshot,
  isValidWorldSnapshot,
  migrateBoatStateToHarbor,
  repairLegacyArchipelagoLayoutPosition,
  repairLegacyOverworldShorePosition,
  type WorldSnapshot,
} from "./worldSnapshot";
import { isVisitorMode } from "./worldSession";
import {
  registerWorldPersistHandler,
  resumeHostPersist,
  scheduleHostSave,
  suspendHostPersist,
  isHostPersistSuspended,
} from "./worldSaveSchedule";
import { STARTING_ZONE_ID } from "./zones";
import type { ZoneId } from "./zoneTypes";

const STORAGE_KEY = "ivyward-save-v1";
/** Pre-rename key; migrate on read so existing host saves are not lost. */
const LEGACY_STORAGE_KEY = "poke-save-v1";
/** Raw payload of the last save that could not be repaired (#190). */
const BACKUP_STORAGE_KEY = "ivyward-save-v1-backup";

const DEFAULT_HOST_POSITION: WorldSnapshot["position"] = {
  zoneId: STARTING_ZONE_ID,
  x: 3,
  y: 7,
};

let hostPosition: WorldSnapshot["position"] = { ...DEFAULT_HOST_POSITION };

function readRawSave(): string | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      return current;
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) {
      return null;
    }
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function updateHostPosition(zoneId: ZoneId, x: number, y: number): void {
  hostPosition = { zoneId, x, y };
  scheduleHostSave();
}

export function persistHostSave(): void {
  if (isVisitorMode() || isHostPersistSuspended()) {
    return;
  }
  try {
    const snapshot = exportWorldSnapshot(hostPosition);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ponytail: ignore quota/private-mode failures
  }
}

registerWorldPersistHandler(persistHostSave);

export function clearHostSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Clear host save and reload a fresh game (same as ?new=1). */
export function resetHostGame(): void {
  clearHostSave();
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  window.location.assign(url.toString());
}

/**
 * Position is the only structurally fragile snapshot field — map layout
 * changes have invalidated saved positions twice before (see the legacy
 * repair functions). Retry validation with the default spawn: first position
 * alone, then also grounding a mid-sail flag that cannot hold at a land
 * spawn. Anything else stays unrepairable (#190).
 */
function repairWithDefaultSpawn(parsed: unknown): WorldSnapshot | null {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  // The default spawn is land, so a mid-sail flag can never hold there —
  // ground it along with the position (the validator would otherwise accept
  // sailing at the grove spawn and load a stuck sail-on-land state).
  const respawned = {
    ...(parsed as Record<string, unknown>),
    position: { ...DEFAULT_HOST_POSITION },
    sailing: false,
  };
  if (isValidWorldSnapshot(respawned)) {
    return respawned;
  }
  return null;
}

function backupRawSave(raw: string): void {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, raw);
  } catch {
    // ponytail: ignore quota/private-mode failures
  }
}

export function loadHostSave(): WorldSnapshot | null {
  let raw: string | null = null;
  try {
    raw = readRawSave();
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    migrateBoatStateToHarbor(parsed);
    repairLegacyOverworldShorePosition(parsed);
    repairLegacyArchipelagoLayoutPosition(parsed);
    if (isValidWorldSnapshot(parsed)) {
      return parsed;
    }
    const repaired = repairWithDefaultSpawn(parsed);
    if (repaired) {
      return repaired;
    }
    // Unrepairable: keep the raw payload recoverable instead of deleting it.
    backupRawSave(raw);
    clearHostSave();
    return null;
  } catch {
    if (raw) {
      backupRawSave(raw);
    }
    clearHostSave();
    return null;
  }
}

export function restoreHostSave(snapshot: WorldSnapshot): void {
  suspendHostPersist();
  applyWorldSnapshot(snapshot);
  hostPosition = { ...snapshot.position };
  resumeHostPersist();
}

export {
  notifyWorldChanged,
  resumeHostPersist,
  suspendHostPersist,
} from "./worldSaveSchedule";
