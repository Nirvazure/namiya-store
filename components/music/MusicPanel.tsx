"use client";

import type { CounterId } from "@/domain/indoor";
import { tracksForCounter } from "@/domain/companions";
import { musicTracks } from "@/domain/musicTracks";
import { musicPlayback } from "@/services/audio/musicPlayback";
import { useMusicStore } from "@/store/useMusicStore";
import { MusicControls } from "@/components/music/MusicControls";
import { CassettePlayer } from "@/components/music/CassettePlayer";

/** Presentation only. Closing this note cannot dispose the audio engine. */
export function MusicPanel({ counter }: { counter: CounterId }) {
  const trackId = useMusicStore(state => state.trackId);
  const playing = useMusicStore(state => state.isPlaying);
  const starting = useMusicStore(state => state.starting);
  const current = musicTracks.find(track => track.id === trackId);
  return <>
    <p className="companion-note-intro">挑一段声音，坐一会儿。</p>
    {counter === "grandpa" && <CassettePlayer />}
    <div className="companion-track-list" aria-label="这家店的曲目">
      {tracksForCounter(counter).map(track => <button type="button" key={track.id} aria-pressed={track.id === trackId} disabled={starting} onClick={() => void musicPlayback.play(track.id)}>
        <span className={`companion-track-mark ${track.id === trackId && playing ? "is-playing" : ""}`} aria-hidden="true" />
        <span>{track.title}</span><span className="companion-track-action">{track.id === trackId && playing ? "正在听" : "播放"}</span>
      </button>)}
    </div>
    {counter !== "grandpa" && <>
      <p className="companion-now-playing">{playing ? "正在听" : "已选"} · {current?.title}</p>
      <MusicControls />
    </>}
  </>;
}
