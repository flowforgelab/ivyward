/** One-line HUD controls under the quest hint (#234). */
export const CONTROL_LEGEND_TEXT = "E interact · WASD move";

/** Matches CSS `@media (hover: none) and (pointer: coarse), (max-width: 820px)`. */
export const CONTROL_LEGEND_NARROW_MAX_PX = 820;

export function shouldShowControlLegend(input: {
  hover: boolean;
  pointerCoarse: boolean;
  viewportWidthPx: number;
}): boolean {
  if (input.viewportWidthPx <= CONTROL_LEGEND_NARROW_MAX_PX) {
    return false;
  }
  if (!input.hover && input.pointerCoarse) {
    return false;
  }
  return true;
}
