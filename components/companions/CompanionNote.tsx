"use client";

import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { companionTriggerId, type CompanionOwner, type CompanionTool } from "@/domain/companions";
import { MusicPanel } from "@/components/music/MusicPanel";
import { PomodoroPanel } from "@/components/pomodoro/PomodoroPanel";
import { useCompanionStore } from "@/store/useCompanionStore";
import { fitCompanionNote, fitSideNote, watchCompanionNote } from "@/services/scene/companionNote";
import { MusicDetails } from "@/components/music/MusicControls";

export function CompanionNote({ owner, tool, label, edgeClearance = 76, returnFocusId }: { owner: CompanionOwner; tool: CompanionTool; label: string; edgeClearance?: number; returnFocusId?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const triggerId = companionTriggerId(owner, tool);

  useLayoutEffect(() => {
    const trigger = document.getElementById(triggerId);
    const note = box.current;
    if (!trigger || !note) return;
    function place() {
      if (!trigger || !note) return;
      const viewport = window.visualViewport;
      const view = { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight };
      const edge = tool === "focus";
      const sideTrigger = edge ? document.getElementById(companionTriggerId("bookmark", "focus")) : null;
      const anchor = (sideTrigger ?? trigger).getBoundingClientRect();
      const dock = document.querySelector<HTMLElement>(".music-dock")?.getBoundingClientRect();
      const footer = document.querySelector<HTMLElement>(".indoor-is-active .indoor-footer")?.getBoundingClientRect();
      const bottomControls = [dock, footer].filter(rect => rect && rect.height > 0);
      const controlTop = Math.min(view.top + view.height, ...bottomControls.map(rect => rect!.top));
      const clearance = Math.min(Math.max(edge ? edgeClearance : 0, view.top + view.height - controlTop), Math.max(0, view.height - 140));
      const availableWidth = sideTrigger ? anchor.left - view.left - 20 : view.width - 24;
      note.style.width = `${Math.min(edge ? 240 : 272, edge ? availableWidth : view.width - 24)}px`;
      note.style.maxHeight = `${view.height - clearance - 24}px`;
      const bounds = note.getBoundingClientRect();
      const position = edge ? fitSideNote(anchor, bounds, view, clearance) : fitCompanionNote(anchor, bounds, { ...view, height: view.height - clearance });
      note.style.left = `${position.left}px`;
      note.style.top = `${position.top}px`;
      note.style.visibility = "visible";
    }
    place();
    note.focus({ preventScroll: true });
    const returnFocus = returnFocusId ? document.getElementById(returnFocusId) ?? trigger : trigger;
    const stopWatching = watchCompanionNote(note, trigger, () => useCompanionStore.getState().close(), document, returnFocus);
    const observer = new ResizeObserver(place);
    observer.observe(note);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
      stopWatching();
    };
  }, [triggerId, tool, edgeClearance, returnFocusId]);

  return createPortal(<div ref={box} id={`${triggerId}-note`} className={`companion-note ${tool === "focus" ? "companion-note-focus" : ""}`} data-companion-interactive role="dialog" aria-labelledby={`${triggerId}-title`} tabIndex={-1} style={{ visibility: "hidden" }} onPointerMove={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"));
    const atStart = event.shiftKey && (document.activeElement === controls[0] || document.activeElement === event.currentTarget);
    const atEnd = !event.shiftKey && document.activeElement === controls.at(-1);
    if (atStart || atEnd) { event.preventDefault(); useCompanionStore.getState().close(); }
  }} onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== document.getElementById(triggerId) && !(tool === "focus" && event.relatedTarget === document.getElementById(companionTriggerId("bookmark", "focus")))) useCompanionStore.getState().close();
  }}>
    <div className="companion-note-heading"><strong id={`${triggerId}-title`}>{label}</strong><button type="button" aria-label="收起控制" onClick={() => useCompanionStore.getState().close()}><X size={16} aria-hidden="true" /></button></div>
    {tool === "music" ? owner !== "outside" && owner !== "bookmark" ? <MusicPanel counter={owner} /> : <MusicDetails /> : <PomodoroPanel />}
  </div>, document.body);
}
