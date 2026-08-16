import { afterEach, describe, expect, it } from "vitest";
import {
  isHostPersistSuspended,
  resumeHostPersist,
  suspendHostPersist,
} from "./worldSaveSchedule";

describe("host persist suspend nesting", () => {
  afterEach(() => {
    while (isHostPersistSuspended()) {
      resumeHostPersist();
    }
  });

  it("stays suspended until every matching resume", () => {
    suspendHostPersist();
    suspendHostPersist();
    resumeHostPersist();
    expect(isHostPersistSuspended()).toBe(true);
    resumeHostPersist();
    expect(isHostPersistSuspended()).toBe(false);
  });
});

import { vi } from "vitest";
import {
  flushPendingHostSave,
  registerWorldPersistHandler,
  scheduleHostSave,
} from "./worldSaveSchedule";

describe("save debounce max-wait and flush (#191)", () => {
  afterEach(() => {
    vi.useRealTimers();
    // Restore the production handler binding for other suites: worldSave
    // registers its own handler at module load; tests here override it.
    registerWorldPersistHandler(() => {});
    flushPendingHostSave();
  });

  it("persists at least once per max-wait under continuous changes", () => {
    vi.useFakeTimers();
    let persists = 0;
    registerWorldPersistHandler(() => {
      persists += 1;
    });
    // Mark dirty every 16ms for 5 seconds of simulated time.
    for (let t = 0; t < 5000; t += 16) {
      scheduleHostSave();
      vi.advanceTimersByTime(16);
    }
    expect(persists).toBeGreaterThanOrEqual(2);
  });

  it("still debounces a single quiet change at the trailing interval", () => {
    vi.useFakeTimers();
    let persists = 0;
    registerWorldPersistHandler(() => {
      persists += 1;
    });
    scheduleHostSave();
    vi.advanceTimersByTime(399);
    expect(persists).toBe(0);
    vi.advanceTimersByTime(1);
    expect(persists).toBe(1);
  });

  it("flushes a pending save synchronously", () => {
    vi.useFakeTimers();
    let persists = 0;
    registerWorldPersistHandler(() => {
      persists += 1;
    });
    scheduleHostSave();
    flushPendingHostSave();
    expect(persists).toBe(1);
    // Nothing pending: flush is a no-op.
    flushPendingHostSave();
    expect(persists).toBe(1);
  });
});
