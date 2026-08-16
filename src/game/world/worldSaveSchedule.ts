const SAVE_DEBOUNCE_MS = 400;
/**
 * The trailing debounce resets on every world change, so continuous walking
 * would defer persistence forever; cap the total wait from the first pending
 * change (#191).
 */
const SAVE_MAX_WAIT_MS = 2000;

let persistSuspendCount = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistHandler: (() => void) | null = null;
/** Timestamp of the first unpersisted change in the current burst. */
let pendingSince: number | null = null;

export function registerWorldPersistHandler(handler: () => void): void {
  persistHandler = handler;
}

export function suspendHostPersist(): void {
  persistSuspendCount += 1;
}

export function resumeHostPersist(): void {
  persistSuspendCount = Math.max(0, persistSuspendCount - 1);
}

function firePendingSave(): void {
  saveTimer = null;
  pendingSince = null;
  persistHandler?.();
}

export function scheduleHostSave(): void {
  if (persistSuspendCount > 0 || !persistHandler) {
    return;
  }
  const now = Date.now();
  if (pendingSince === null) {
    pendingSince = now;
  }
  const untilMaxWait = pendingSince + SAVE_MAX_WAIT_MS - now;
  const delay = Math.max(0, Math.min(SAVE_DEBOUNCE_MS, untilMaxWait));
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(firePendingSave, delay);
}

/**
 * Synchronously persist any pending save. Wired to pagehide and
 * visibilitychange so closing or backgrounding the tab never drops the last
 * debounce window of progress (#191).
 */
export function flushPendingHostSave(): void {
  if (!saveTimer) {
    return;
  }
  clearTimeout(saveTimer);
  firePendingSave();
}

export function notifyWorldChanged(): void {
  scheduleHostSave();
}

export function isHostPersistSuspended(): boolean {
  return persistSuspendCount > 0;
}
