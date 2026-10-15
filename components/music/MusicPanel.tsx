"use client";

import { Pause } from "@phosphor-icons/react/dist/csr/Pause";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import type { CounterId } from "@/domain/indoor";
import { tracksForCounter } from "@/domain/companions";
import { musicTracks } from "@/domain/musicTracks";
import { musicPlayback } from "@/services/audio/musicPlayback";
import { useMusicStore } from "@/store/useMusicStore";

export function MusicControls({ compact = false }: { compact?: boolean }) {
  const playing = useMusicStore(state => state.isPlaying);
  const starting = useMusicStore(state => state.starting);
  const volume = useMusicStore(state => state.volume);
  const setVolume = useMusicStore(state => state.setVolume);
  const error = useMusicStore(state => state.error);
  return <div className={`companion-music-controls ${compact ? "is-compact" : ""}`}>
    <button className="companion-play" type="button" aria-label={starting ? "正在准备播放" : playing ? "暂停音乐" : "播放音乐"} aria-pressed={playing} disabled={starting} onClick={() => void musicPlayback.toggle()}>
      {playing ? <Pause size={16} weight="fill" aria-hidden="true" /> : <Play size={16} weight="fill" aria-hidden="true" />}
      {!compact && <span>{starting ? "请稍候" : playing ? "暂停" : "播放"}</span>}
    </button>
    <label className="companion-volume"><SpeakerHigh size={15} aria-hidden="true" /><span className="sr-only">音量</span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))} aria-valuetext={`${Math.round(volume * 100)}%`} /></label>
    {error && <p className="companion-error" role="alert">{error}</p>}
  </div>;
}

/** Presentation only. Closing this note cannot dispose the audio engine. */
export function MusicPanel({ counter }: { counter: CounterId }) {
  const trackId = useMusicStore(state => state.trackId);
  const playing = useMusicStore(state => state.isPlaying);
  const starting = useMusicStore(state => state.starting);
  const current = musicTracks.find(track => track.id === trackId);
  return <>
    <p className="companion-note-intro">挑一段声音，坐一会儿。</p>
    <div className="companion-track-list" aria-label="这家店的曲目">
      {tracksForCounter(counter).map(track => <button type="button" key={track.id} aria-pressed={track.id === trackId} disabled={starting} onClick={() => void musicPlayback.play(track.id)}>
        <span className={`companion-track-mark ${track.id === trackId && playing ? "is-playing" : ""}`} aria-hidden="true" />
        <span>{track.title}</span><span className="companion-track-action">{track.id === trackId && playing ? "正在听" : "播放"}</span>
      </button>)}
    </div>
    <p className="companion-now-playing">{playing ? "正在听" : "已选"} · {current?.title}</p>
    <MusicControls />
  </>;
}
