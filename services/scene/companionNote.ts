type NoteViewport = { left: number; top: number; width: number; height: number };
type NoteAnchor = { left: number; top: number; bottom: number; width: number };

export function fitEdgeNote(size: { width: number; height: number }, viewport: NoteViewport, bottomClearance: number) {
  return {
    left: Math.max(viewport.left + 12, viewport.left + viewport.width - size.width - 12),
    top: Math.max(viewport.top + 12, viewport.top + viewport.height - size.height - bottomClearance - 12),
  };
}

/** Expand beside the collapsed timer while keeping both visible above bottom controls. */
export function fitSideNote(anchor: NoteAnchor, size: { width: number; height: number }, viewport: NoteViewport, bottomClearance: number) {
  return {
    left: Math.max(viewport.left + 12, Math.min(anchor.left - size.width - 8, viewport.left + viewport.width - size.width - 12)),
    top: Math.max(viewport.top + 12, Math.min(anchor.bottom - size.height, viewport.top + viewport.height - bottomClearance - size.height - 12)),
  };
}

export function fitCompanionNote(anchor: NoteAnchor, size: { width: number; height: number }, viewport: NoteViewport) {
  const inset = 12;
  const minLeft = viewport.left + inset;
  const minTop = viewport.top + inset;
  const maxRight = viewport.left + viewport.width - inset;
  const maxBottom = viewport.top + viewport.height - inset;
  const above = anchor.top - size.height - 10;
  return {
    left: Math.max(minLeft, Math.min(maxRight - size.width, anchor.left + anchor.width / 2 - size.width / 2)),
    top: Math.max(minTop, Math.min(maxBottom - size.height, above >= minTop ? above : anchor.bottom + 10)),
  };
}

export function watchCompanionNote(note: HTMLElement, trigger: HTMLElement, close: () => void, page = document, returnFocus = trigger) {
  function outside(event: PointerEvent) {
    const target = event.target;
    if (target instanceof Node && !note.contains(target) && !trigger.contains(target)) close();
  }
  function escape(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
  }
  page.addEventListener("pointerdown", outside);
  page.addEventListener("keydown", escape);
  return () => {
    page.removeEventListener("pointerdown", outside);
    page.removeEventListener("keydown", escape);
    if (note.contains(page.activeElement) && returnFocus.isConnected !== false && !returnFocus.closest("[inert], [hidden]")) returnFocus.focus({ preventScroll: true });
  };
}
