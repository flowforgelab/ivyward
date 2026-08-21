type OverlayEntry = {
  id: string;
  close: () => void;
};

const stack: OverlayEntry[] = [];
let listenerBound = false;

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }
  if (stack.length === 0) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  const top = stack[stack.length - 1];
  top?.close();
}

function ensureListener(): void {
  if (listenerBound) {
    return;
  }
  window.addEventListener("keydown", onKeyDown, true);
  listenerBound = true;
}

/** Register an open overlay; Esc closes the top-most entry only. */
export function pushOverlay(id: string, close: () => void): void {
  const existing = stack.findIndex((entry) => entry.id === id);
  if (existing >= 0) {
    stack.splice(existing, 1);
  }
  stack.push({ id, close });
  ensureListener();
}

/** Remove an overlay from the stack (idempotent). */
export function popOverlay(id: string): void {
  const idx = stack.findIndex((entry) => entry.id === id);
  if (idx >= 0) {
    stack.splice(idx, 1);
  }
}

export function getTopOverlayId(): string | null {
  return stack.length ? stack[stack.length - 1]!.id : null;
}

/** Test helper. */
export function getOverlayStackIds(): string[] {
  return stack.map((entry) => entry.id);
}

/** Test helper. */
export function resetOverlayStack(): void {
  stack.length = 0;
}
