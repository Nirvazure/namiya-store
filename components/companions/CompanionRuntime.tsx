"use client";

import { useEffect } from "react";
import { musicPlayback } from "@/services/audio/musicPlayback";
import { watchFocusClock } from "@/services/scene/focusClock";
import { useMusicStore } from "@/store/useMusicStore";
import { usePomodoroStore } from "@/store/usePomodoroStore";

export function CompanionRuntime() {
  useEffect(() => {
    useMusicStore.getState().hydrate();
    usePomodoroStore.getState().hydrate();
    const stopMusic = musicPlayback.mount();
    const stopClock = watchFocusClock();
    return () => { stopMusic(); stopClock(); };
  }, []);
  return null;
}
