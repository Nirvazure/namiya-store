type SnapOptions = {
  count: number;
  initialIndex: number;
  isPaused: () => boolean;
  onSelect: (index: number) => void;
  onMove: () => void;
};

// Own horizontal input so native momentum cannot carry a snapped counter onward.
export function attachIndoorSnap(viewport: HTMLDivElement, options: SnapOptions) {
  const threshold = .2;
  let width = viewport.clientWidth;
  let index = options.initialIndex;
  let origin = index;
  let distance = 0;
  let snapped = false;
  let gesture: "touch" | "wheel" | null = null;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;
  let touchId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let dragged = false;
  let suppressClickUntil = 0;
  const clamp = (value: number) => Math.max(0, Math.min(options.count - 1, value));

  function center(next = index) {
    index = clamp(next);
    viewport.scrollLeft = index * width;
    options.onSelect(index);
    options.onMove();
  }
  function cancel() {
    clearTimeout(wheelTimer);
    gesture = null;
    touchId = null;
    distance = 0;
    snapped = false;
    center();
  }
  function begin(kind: "touch" | "wheel") {
    cancel();
    gesture = kind;
    origin = index;
  }
  function moveBy(delta: number) {
    if (snapped || !width) return;
    distance += delta;
    if (Math.abs(distance) >= width * threshold) {
      snapped = true;
      center(origin + Math.sign(distance));
    } else {
      viewport.scrollLeft = Math.max(0, Math.min((options.count - 1) * width, origin * width + distance));
      options.onMove();
    }
  }
  function onWheel(event: WheelEvent) {
    if (event.ctrlKey || isCompanionControl(event.target)) return;
    event.preventDefault();
    if (options.isPaused() || gesture === "touch") return;
    if (gesture !== "wheel") begin("wheel");
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? width : 1;
    moveBy(delta * unit * 1.5);
    clearTimeout(wheelTimer);
    // Keep the latch through the input's momentum tail, resetting after quiet.
    wheelTimer = setTimeout(cancel, 280);
  }
  function onTouchStart(event: TouchEvent) {
    if (isCompanionControl(event.target)) return;
    if (options.isPaused() || event.touches.length !== 1) { cancel(); return; }
    begin("touch");
    const touch = event.touches[0];
    touchId = touch.identifier;
    startX = lastX = touch.clientX;
    startY = touch.clientY;
    dragged = false;
    suppressClickUntil = 0;
  }
  function onTouchMove(event: TouchEvent) {
    if (options.isPaused() || event.touches.length !== 1) { cancel(); return; }
    const touch = Array.from(event.touches).find(point => point.identifier === touchId);
    if (!touch || gesture !== "touch") return;
    if (!dragged && (Math.abs(touch.clientX - startX) < 8 || Math.abs(touch.clientX - startX) <= Math.abs(touch.clientY - startY))) return;
    dragged = true;
    if (event.cancelable) event.preventDefault();
    suppressClickUntil = performance.now() + 500;
    moveBy(lastX - touch.clientX);
    lastX = touch.clientX;
  }
  function onTouchEnd(event: TouchEvent) {
    if (touchId === null || Array.from(event.touches).some(touch => touch.identifier === touchId)) return;
    if (dragged) suppressClickUntil = performance.now() + 500;
    cancel();
  }
  function onClick(event: MouseEvent) {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  center();
  const resize = new ResizeObserver(() => {
    if (!viewport.clientWidth || viewport.clientWidth === width) return;
    width = viewport.clientWidth;
    cancel();
  });
  resize.observe(viewport);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("touchstart", onTouchStart, { passive: true });
  viewport.addEventListener("touchmove", onTouchMove, { passive: false });
  viewport.addEventListener("touchend", onTouchEnd);
  viewport.addEventListener("touchcancel", onTouchEnd);
  viewport.addEventListener("click", onClick, true);
  return {
    select(next: number) {
      if (options.isPaused()) return;
      cancel();
      center(next);
    },
    cancel,
    destroy() {
      clearTimeout(wheelTimer);
      resize.disconnect();
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("click", onClick, true);
    },
  };
}

function isCompanionControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-companion-interactive]"));
}
