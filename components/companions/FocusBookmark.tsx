"use client";

import { companionTriggerId } from "@/domain/companions";
import { focusBookmarkState } from "@/domain/focusBookmark";
import { CompanionNote } from "@/components/companions/CompanionNote";
import { useCompanionStore } from "@/store/useCompanionStore";
import { usePomodoroStore } from "@/store/usePomodoroStore";
import { useIndoorStore } from "@/store/useIndoorStore";
import "./companions.css";
import { Clock } from "@phosphor-icons/react/dist/csr/Clock";

export function FocusBookmark({ outside, hidden }: { outside: boolean; hidden: boolean }) {
  const active = useCompanionStore(state => state.active);
  const toggle = useCompanionStore(state => state.toggle);
  const remaining = usePomodoroStore(state => state.remainingSeconds);
  const duration = usePomodoroStore(state => state.durationSeconds);
  const running = usePomodoroStore(state => state.isRunning);
  const counter = useIndoorStore(state => state.currentCounter);
  const presentation = focusBookmarkState(remaining, duration, running);
  const open = active?.tool === "focus";
  const triggerId = companionTriggerId("bookmark", "focus");
  if (hidden) return null;

  return <>
    {(outside || presentation.status !== "idle" || open) && <button id={triggerId} className={`focus-bookmark focus-is-${presentation.status}`} data-location={outside ? "outside" : "inside"} data-companion-interactive type="button" aria-label={presentation.label} aria-expanded={open} aria-controls={open ? `${companionTriggerId(active.owner, "focus")}-note` : undefined} onPointerDown={event => event.stopPropagation()} onClick={() => open ? useCompanionStore.getState().close() : toggle("bookmark", "focus")}>
      {presentation.status === "idle" && <Clock size={18} aria-hidden="true" />}
      <span className="focus-bookmark-text">{presentation.status === "idle" ? "专注" : presentation.text}</span>
      {presentation.status !== "idle" && <small>{presentation.status === "paused" ? "已暂停" : presentation.status === "running" ? "专注中" : "歇一会儿"}</small>}
      {presentation.status !== "idle" && <span className="focus-bookmark-progress" aria-hidden="true"><i style={{ transform: `scaleX(${presentation.progress})` }} /></span>}
    </button>}
    {open && <CompanionNote key={active.owner} owner={active.owner} tool="focus" label="专注片刻" returnFocusId={!outside ? companionTriggerId(counter, "focus") : undefined} />}
  </>;
}
