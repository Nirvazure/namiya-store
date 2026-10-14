"use client";

import { useEffect } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { usePomodoroStore } from "@/store/usePomodoroStore";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function PomodoroPanel() {
  const panelOpen = usePomodoroStore((state) => state.panelOpen);
  const remainingSeconds = usePomodoroStore((state) => state.remainingSeconds);
  const isRunning = usePomodoroStore((state) => state.isRunning);
  const togglePanel = usePomodoroStore((state) => state.togglePanel);
  const start = usePomodoroStore((state) => state.start);
  const pause = usePomodoroStore((state) => state.pause);
  const reset = usePomodoroStore((state) => state.reset);
  const tick = usePomodoroStore((state) => state.tick);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, tick]);

  if (!panelOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-20 w-[min(320px,calc(100vw-2rem))]">
      <section aria-label="番茄钟" className="rounded-[3px_7px_4px_6px] border border-[#b4a78f] bg-[#f1e9d9] bg-[radial-gradient(ellipse_at_15%_0%,rgba(206,178,130,.18),transparent_70%)] p-5 text-[#3c463a] shadow-[0_12px_40px_rgba(12,23,17,.12)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs tracking-[0.15em] text-[#7d806a]">番茄钟</p>
            <h2 className="font-serif text-xl tracking-wide">陪你专注一会儿</h2>
          </div>
          <button aria-label="关闭番茄钟面板" className="min-h-11 shrink-0 rounded-sm px-2 text-xs text-[#737961] transition-colors hover:bg-[#e3d9c5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#668072]" onClick={togglePanel} type="button">
            关闭
          </button>
        </div>
        <div className="rounded-sm border border-[#c9bca3] bg-[#f8f3e9]/80 py-6 text-center font-mono text-5xl font-medium tracking-wider text-[#344b42]">
          {formatTime(remainingSeconds)}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <PixelButton onClick={start} type="button">
            开始
          </PixelButton>
          <PixelButton onClick={pause} type="button" variant="secondary">
            暂停
          </PixelButton>
          <PixelButton onClick={reset} type="button" variant="ghost">
            重置
          </PixelButton>
        </div>
      </section>
    </div>
  );
}
