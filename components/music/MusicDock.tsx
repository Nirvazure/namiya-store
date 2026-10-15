"use client";

import Image from "next/image";
import { useEffect } from "react";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { MusicControls, MusicPlayButton } from "@/components/music/MusicControls";
import { CompanionNote } from "@/components/companions/CompanionNote";
import { companionTriggerId } from "@/domain/companions";
import { musicTracks } from "@/domain/musicTracks";
import { useMusicStore } from "@/store/useMusicStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import "@/components/companions/companions.css";
import "./music-dock.css";

/** A shared view of the single audio engine; scene changes never remount audio. */
export function MusicDock({ outside, hidden }: { outside: boolean; hidden: boolean }) {
  const trackId = useMusicStore(state => state.trackId);
  const playing = useMusicStore(state => state.isPlaying);
  const starting = useMusicStore(state => state.starting);
  const error = useMusicStore(state => state.error);
  const active = useCompanionStore(state => state.active);
  const toggle = useCompanionStore(state => state.toggle);
  const open = active?.owner === "outside" && active.tool === "music";
  const track = musicTracks.find(track => track.id === trackId);
  const triggerId = companionTriggerId("outside", "music");
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    function closeUnavailableDetails() {
      const selected = useCompanionStore.getState().active;
      if (!outside && desktop.matches && selected?.owner === "outside" && selected.tool === "music") useCompanionStore.getState().close();
    }
    closeUnavailableDetails();
    desktop.addEventListener("change", closeUnavailableDetails);
    return () => desktop.removeEventListener("change", closeUnavailableDetails);
  }, [outside]);
  if (hidden) return null;
  return <>
    <div className="music-dock" data-location={outside ? "outside" : "inside"} data-companion-interactive aria-label="音乐播放栏">
      <button id={triggerId} className="music-dock-summary" type="button" aria-label={`${track?.title ?? "环境声音"}，打开音乐详情与音量`} aria-expanded={open} aria-controls={open ? `${triggerId}-note` : undefined} onClick={() => toggle("outside", "music")}>
        <span className="music-dock-cover" aria-hidden="true"><Image src="/site-logo.png" width={36} height={42} alt="" /></span>
        <span className="music-dock-copy"><span className="music-dock-title">{track?.title}</span><small>{starting ? "正在准备播放…" : error ? "播放遇到问题，点此重试" : playing ? "正在播放 · 陪你坐一会儿" : "轻按播放，听一会儿"}</small></span>
        <CaretUp className="music-dock-chevron" size={14} aria-hidden="true" />
      </button>
      <div className="music-dock-desktop"><MusicControls compact /></div>
      <div className="music-dock-mobile"><MusicPlayButton compact /></div>
    </div>
    {open && <CompanionNote owner="outside" tool="music" label="街角的声音" />}
  </>;
}
