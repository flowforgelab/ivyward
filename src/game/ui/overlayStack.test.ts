import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOverlayStackIds,
  popOverlay,
  pushOverlay,
  resetOverlayStack,
} from "./overlayStack";

describe("overlayStack", () => {
  afterEach(() => {
    resetOverlayStack();
  });

  it("Esc closes only the top-most overlay", () => {
    const lower = vi.fn();
    const upper = vi.fn();
    pushOverlay("inventory", lower);
    pushOverlay("recipes", upper);
    expect(getOverlayStackIds()).toEqual(["inventory", "recipes"]);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();

    popOverlay("recipes");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(lower).toHaveBeenCalledTimes(1);
  });

  it("Esc with an empty stack is a no-op", () => {
    expect(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    ).not.toThrow();
  });
});
