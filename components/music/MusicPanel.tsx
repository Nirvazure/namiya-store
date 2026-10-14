"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "@phosphor-icons/react";
import { musicTracks } from "@/domain/musicTracks";
import { useMusicStore } from "@/store/useMusicStore";
import { AmbientAudio } from "@/services/audio/ambientAudio";

export function MusicPanel() {
  const panelOpen = useMusicStore((state) => state.panelOpen);
  const trackId = useMusicStore((state) => state.trackId);
  const isPlaying = useMusicStore((state) => state.isPlaying);
  const volume = useMusicStore((state) => state.volume);
  const setTrack = useMusicStore((state) => state.setTrack);
  const togglePlaying = useMusicStore((state) => state.togglePlaying);
  const setVolume = useMusicStore((state) => state.setVolume);
  const togglePanel = useMusicStore((state) => state.togglePanel);
  const audio = useRef<AmbientAudio | null>(null);
  const [audioError, setAudioError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    audio.current?.setVolume(volume);
    audio.current?.setTrack(trackId);
    if (!isPlaying) void audio.current?.pause().catch(() => {});
  }, [isPlaying, trackId, volume]);

  useEffect(() => () => {
    void audio.current?.dispose().catch(() => {});
    audio.current = null;
    if (useMusicStore.getState().isPlaying) useMusicStore.getState().togglePlaying();
  }, []);

  async function handlePlayback() {
    if (starting) return;
    setAudioError("");
    setStarting(true);
    try {
      if (isPlaying) {
        await audio.current?.pause();
        togglePlaying();
      } else {
        audio.current ??= new AmbientAudio();
        await audio.current.play(trackId, volume);
        togglePlaying();
      }
    } catch {
      setAudioError(isPlaying ? "声音暂时无法暂停，请刷新页面后重试。" : "暂时无法播放声音，请允许浏览器播放音频后重试。");
    } finally {
      setStarting(false);
    }
  }

  if (!panelOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 z-20 w-[min(360px,calc(100vw-2rem))]">
      <section aria-label="旧音乐机" className="border border-[#687265]/50 bg-[#f4eddf] p-6 font-serif text-[#344b42] shadow-[0_12px_45px_#172a2a26]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[.18em] text-[#687265]">旧音乐机</p>
            <h2 className="mt-2 text-xl font-normal">留一点声音，陪你写信</h2>
          </div>
          <button aria-label="关闭音乐面板" className="p-1 text-[#687265]" onClick={togglePanel} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-2">
          {musicTracks.map((track) => (
            <button
              key={track.id}
              aria-pressed={track.id === trackId}
              className={`border p-3 text-left text-sm transition-colors ${
                track.id === trackId ? "border-[#344b42] bg-[#e4e6d8]" : "border-[#687265]/25 hover:bg-[#e4e6d8]/50"
              }`}
              onClick={() => setTrack(track.id)}
              type="button"
            >
              <strong className="font-normal tracking-wider">{track.title}</strong>
              <span className="mt-1 block leading-5 opacity-80">{track.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button aria-pressed={isPlaying} className="flex shrink-0 items-center gap-2 border border-[#344b42] bg-[#344b42] px-4 py-2 text-sm text-[#f4eddf] disabled:opacity-50" disabled={starting} onClick={handlePlayback} type="button">
            {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            {starting ? "请稍候" : isPlaying ? "暂停" : "播放"}
          </button>
          <input
            aria-label="音量"
            className="min-w-0 flex-1 accent-[#344b42]"
            max="1"
            min="0"
            onChange={(event) => setVolume(Number(event.target.value))}
            step="0.05"
            type="range"
            value={volume}
          />
        </div>
        <p aria-live="polite" className="mt-3 text-[11px] leading-5 text-[#687265]">{isPlaying ? "正在播放 · " : "轻按播放 · "}本地生成的雨声与低音环境声</p>
        {audioError && <p role="alert" className="mt-2 text-xs leading-5 text-[#9a4734]">{audioError}</p>}
      </section>
    </div>
  );
}
