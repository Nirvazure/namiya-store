"use client";

import { musicTracks } from "@/domain/musicTracks";
import { useMusicStore } from "@/store/useMusicStore";
import { usePomodoroStore } from "@/store/usePomodoroStore";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function StatusBar() {
  const trackId = useMusicStore((state) => state.trackId);
  const isPlaying = useMusicStore((state) => state.isPlaying);
  const remainingSeconds = usePomodoroStore((state) => state.remainingSeconds);
  const isRunning = usePomodoroStore((state) => state.isRunning);
  const track = musicTracks.find((item) => item.id === trackId);

  if (!isPlaying && !isRunning) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4">
      {isPlaying ? (
        <div className="rounded-sm border border-[#b4a78f]/70 bg-[#f1e9d9]/95 px-4 py-2 font-serif text-xs tracking-wide text-[#344b42] backdrop-blur-sm">
          {track?.title ?? "轻音乐"} · 播放中
        </div>
      ) : null}
      {isRunning ? (
        <div className="rounded-sm border border-[#b4a78f]/70 bg-[#f1e9d9]/95 px-4 py-2 font-serif text-xs tracking-wide text-[#344b42] backdrop-blur-sm">
          专注中 · {formatTime(remainingSeconds)}
        </div>
      ) : null}
    </div>
  );
}
