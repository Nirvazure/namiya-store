"use client";

import type { CounterId } from "@/domain/indoor";
import { companionTriggerId, counterCompanions, type CompanionTool } from "@/domain/companions";
import { CompanionObject } from "@/components/companions/CompanionObject";
import { CompanionArtwork } from "@/components/companions/CompanionArtwork";
import { CompanionNote } from "@/components/companions/CompanionNote";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useMusicStore } from "@/store/useMusicStore";
import { usePomodoroStore } from "@/store/usePomodoroStore";
import "./companions.css";

export function IndoorCompanions({ counter }: { counter: CounterId }) {
  const config = counterCompanions[counter];
  const active = useCompanionStore(state => state.active);
  const toggle = useCompanionStore(state => state.toggle);
  const playing = useMusicStore(state => state.isPlaying);
  const trackId = useMusicStore(state => state.trackId);
  const remaining = usePomodoroStore(state => state.remainingSeconds);
  const duration = usePomodoroStore(state => state.durationSeconds);
  const heardHere = playing && config.trackIds.includes(trackId);
  return <>
    {(["music", "focus"] as CompanionTool[]).map(tool => {
      const open = active?.owner === counter && active.tool === tool;
      const label = tool === "music" ? config.musicLabel : config.focusLabel;
      const triggerId = companionTriggerId(counter, tool);
      const artwork = tool === "music" ? config.musicArtwork : config.focusArtwork;
      return <div key={tool} className={`companion-spot companion-${tool} companion-at-${counter}`} data-companion-interactive>
        <button id={triggerId} className="companion-object-button" type="button" aria-label={`${label} · ${tool === "music" ? "听一会儿" : "专注片刻"}`} aria-expanded={open} aria-controls={open ? `${triggerId}-note` : undefined} onClick={() => toggle(counter, tool)}>
          {artwork ? <CompanionArtwork artwork={artwork} progress={1 - remaining / duration} /> : <CompanionObject kind={tool === "music" ? config.musicDevice : config.focusDevice} playing={tool === "music" && heardHere} progress={1 - remaining / duration} />}
          <span className="companion-object-caption">{tool === "music" ? "听一会儿" : "专注片刻"}</span>
        </button>
        {tool === "music" && heardHere && <span className="companion-small-status">正在听</span>}
        {open && tool === "music" && <CompanionNote owner={counter} tool={tool} label={label} />}
      </div>;
    })}
  </>;
}
