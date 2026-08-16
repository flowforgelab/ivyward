import { beforeEach, describe, expect, it } from "vitest";
import { clearHostSave, loadHostSave } from "./worldSave";
import { exportWorldSnapshot, type WorldSnapshot } from "./worldSnapshot";
import { STARTING_ZONE_ID } from "./zones";

// Neither Node's experimental localStorage global nor happy-dom's window
// expose a working Storage in this vitest environment; give the module under
// test a real in-memory store so assertions read what it writes.
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage(),
  configurable: true,
  writable: true,
});

const STORAGE_KEY = "ivyward-save-v1";
const BACKUP_STORAGE_KEY = "ivyward-save-v1-backup";

function storedSnapshot(position: WorldSnapshot["position"]): Record<
  string,
  unknown
> {
  return exportWorldSnapshot(position) as unknown as Record<string, unknown>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("loadHostSave repair path (#190)", () => {
  it("repairs a save whose only defect is an invalid position", () => {
    const snapshot = storedSnapshot({ zoneId: STARTING_ZONE_ID, x: 3, y: 7 });
    snapshot.position = { zoneId: STARTING_ZONE_ID, x: 9999, y: 9999 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    const loaded = loadHostSave();

    expect(loaded).not.toBeNull();
    expect(loaded?.position).toEqual({
      zoneId: STARTING_ZONE_ID,
      x: 3,
      y: 7,
    });
    expect(loaded?.party).toEqual(snapshot.party);
    expect(loaded?.materials).toEqual(snapshot.materials);
    expect(loaded?.questProgress).toEqual(snapshot.questProgress);
    expect(localStorage.getItem(BACKUP_STORAGE_KEY)).toBeNull();
  });

  it("grounds a mid-sail flag when the default spawn repairs the save", () => {
    const snapshot = storedSnapshot({ zoneId: STARTING_ZONE_ID, x: 3, y: 7 });
    snapshot.position = { zoneId: "mistwood", x: 9999, y: 9999 };
    snapshot.sailing = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    const loaded = loadHostSave();

    expect(loaded).not.toBeNull();
    expect(loaded?.position.zoneId).toBe(STARTING_ZONE_ID);
    expect(loaded?.sailing).toBe(false);
  });

  it("backs up an unrepairable save instead of deleting it", () => {
    const snapshot = storedSnapshot({ zoneId: STARTING_ZONE_ID, x: 3, y: 7 });
    snapshot.party = "garbage";
    const raw = JSON.stringify(snapshot);
    localStorage.setItem(STORAGE_KEY, raw);

    const loaded = loadHostSave();

    expect(loaded).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_STORAGE_KEY)).toBe(raw);
  });

  it("backs up unparseable JSON instead of deleting it", () => {
    const raw = '{"broken": tru';
    localStorage.setItem(STORAGE_KEY, raw);

    const loaded = loadHostSave();

    expect(loaded).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_STORAGE_KEY)).toBe(raw);
  });

  it("still loads a fully valid save unchanged", () => {
    const snapshot = storedSnapshot({ zoneId: STARTING_ZONE_ID, x: 3, y: 7 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    const loaded = loadHostSave();

    expect(loaded).toEqual(snapshot);
    expect(localStorage.getItem(BACKUP_STORAGE_KEY)).toBeNull();
  });

  it("clearHostSave leaves the backup key intact", () => {
    localStorage.setItem(BACKUP_STORAGE_KEY, "keep-me");
    clearHostSave();
    expect(localStorage.getItem(BACKUP_STORAGE_KEY)).toBe("keep-me");
  });
});
