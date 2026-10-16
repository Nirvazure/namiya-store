"use client";
import { useRef, type KeyboardEvent, type PointerEvent, type MouseEvent } from "react";
import { swipeDirection } from "@/services/shops/exploration";

const interactive = "button,a,input,textarea,select,summary,[role=dialog],[contenteditable=true],[data-companion-interactive]";
export function useShopSwipe(enabled: boolean, onMove: (direction: "next" | "previous") => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      start.current = null;
      if (!enabled || !event.isPrimary || event.button !== 0 || event.target instanceof Element && event.target.closest(interactive)) return;
      if (event.pointerType === "touch" && (event.clientX < 24 || event.clientX > innerWidth - 24)) return;
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const origin = start.current;
      if (origin?.id === event.pointerId && Math.abs(event.clientX - origin.x) >= 60 && Math.abs(event.clientX - origin.x) > Math.abs(event.clientY - origin.y) * 1.5) {
        event.currentTarget.setPointerCapture(event.pointerId); suppressClick.current = true;
      }
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const origin = start.current; start.current = null;
      if (enabled && origin?.id === event.pointerId) {
        const direction = swipeDirection(event.clientX - origin.x, event.clientY - origin.y);
        if (direction) { suppressClick.current = true; onMove(direction); }
      }
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    },
    onPointerCancel() { start.current = null; suppressClick.current = false; },
    onClickCapture(event: MouseEvent<HTMLDivElement>) { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } },
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (!enabled || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target instanceof Element && event.target.closest(interactive)) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); onMove(event.key === "ArrowRight" ? "next" : "previous"); }
    },
  };
}
