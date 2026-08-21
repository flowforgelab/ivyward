import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTROL_LEGEND_NARROW_MAX_PX,
  CONTROL_LEGEND_TEXT,
  shouldShowControlLegend,
} from "./controlLegend";

const INDEX_HTML = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const STYLE_CSS = readFileSync(path.join(process.cwd(), "src/style.css"), "utf8");

describe("control legend", () => {
  it("uses the decided HUD copy and is not a click-to-dismiss control", () => {
    expect(CONTROL_LEGEND_TEXT).toBe("E interact · WASD move");
    expect(CONTROL_LEGEND_TEXT.toLowerCase()).not.toMatch(/click|tap|dismiss|ok/);
  });

  it("is already in index.html under the quest hint for a cold host load", () => {
    const hintAt = INDEX_HTML.indexOf('id="status-quest-hint"');
    const legendAt = INDEX_HTML.indexOf('id="status-control-legend"');
    expect(hintAt).toBeGreaterThan(-1);
    expect(legendAt).toBeGreaterThan(hintAt);
    expect(INDEX_HTML).toContain(CONTROL_LEGEND_TEXT);
  });

  it("hides the HUD legend in the same style.css media query as the touch overlay", () => {
    const query = `@media (hover: none) and (pointer: coarse), (max-width: ${CONTROL_LEGEND_NARROW_MAX_PX}px)`;
    const queryAt = STYLE_CSS.indexOf(query);
    expect(queryAt).toBeGreaterThan(-1);
    expect(STYLE_CSS.slice(queryAt)).toMatch(
      /\.status-control-legend\s*\{[^}]*display:\s*none/,
    );
  });

  it("shows on a wide hover desktop and hides with the touch overlay rule", () => {
    expect(
      shouldShowControlLegend({
        hover: true,
        pointerCoarse: false,
        viewportWidthPx: 1280,
      }),
    ).toBe(true);
    expect(
      shouldShowControlLegend({
        hover: true,
        pointerCoarse: false,
        viewportWidthPx: CONTROL_LEGEND_NARROW_MAX_PX,
      }),
    ).toBe(false);
    expect(
      shouldShowControlLegend({
        hover: false,
        pointerCoarse: true,
        viewportWidthPx: 1280,
      }),
    ).toBe(false);
  });
});
