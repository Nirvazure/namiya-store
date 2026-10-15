"use client";

import { Pause } from "@phosphor-icons/react/dist/csr/Pause";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { musicPlayback } from "@/services/audio/musicPlayback";
import { useMusicStore } from "@/store/useMusicStore";
import { musicTracks } from "@/domain/musicTracks";

export function MusicPlayButton({ compact = false }: { compact?: boolean }) {
  const playing = useMusicStore(state => state.isPlaying);
  const starting = useMusicStore(state => state.starting);
  return <button className="companion-play" type="button" aria-label={starting ? "正在准备播放" : playing ? "暂停音乐" : "播放音乐"} aria-pressed={playing} disabled={starting} onClick={() => void musicPlayback.toggle()}>
    {playing ? <Pause size={16} weight="fill" aria-hidden="true" /> : <Play size={16} weight="fill" aria-hidden="true" />}
    {!compact && <span>{starting ? "请稍候" : playing ? "暂停" : "播放"}</span>}
  </button>;
}

export function MusicControls({ compact = false }: { compact?: boolean }) {
  const volume = useMusicStore(state => state.volume);
  const setVolume = useMusicStore(state => state.setVolume);
  const error = useMusicStore(state => state.error);
  return <div className={`companion-music-controls ${compact ? "is-compact" : ""}`}>
    <MusicPlayButton compact={compact} />
    <label className="companion-volume"><SpeakerHigh size={15} aria-hidden="true" /><span className="sr-only">音量</span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))} aria-valuetext={`${Math.round(volume * 100)}%`} /></label>
    {error && <p className="companion-error" role="alert">{error}</p>}
  </div>;
}

export function MusicDetails() {
  const trackId = useMusicStore(state => state.trackId);
  const track = musicTracks.find(track => track.id === trackId);
  return <>
    <p className="companion-current-title">{track?.title}</p>
    <p className="companion-note-intro">{track?.description}</p>
    <MusicControls />
  </>;
}
