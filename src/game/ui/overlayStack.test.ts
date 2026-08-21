import { afterEach, describe, expect, it, vi } from "vitest";
import { getOverlayStackIds, getTopOverlayId, popOverlay, pushOverlay, resetOverlayStack } from "./overlayStack";

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


  it("stops later capture listeners after closing the top overlay", () => {
    const upper = vi.fn();
    const lowerCapture = vi.fn();
    pushOverlay("inventory", () => undefined);
    pushOverlay("recipes", () => {
      upper();
      // simulate recipes becoming hidden before later listeners run
    });
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          lowerCapture();
        }
      },
      true,
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lowerCapture).not.toHaveBeenCalled();
  });

  it("returns the top overlay id", () => {
    pushOverlay("shrine", () => undefined);
    pushOverlay("craft-hud", () => undefined);
    expect(getTopOverlayId()).toBe("craft-hud");
    popOverlay("craft-hud");
    expect(getTopOverlayId()).toBe("shrine");
  });

  it("Esc with an empty stack is a no-op", () => {
    expect(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    ).not.toThrow();
  });
});
