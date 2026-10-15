"use client";

import { useEffect } from "react";
import { musicPlayback } from "@/services/audio/musicPlayback";
import { watchFocusClock } from "@/services/scene/focusClock";

export function CompanionRuntime() {
  useEffect(() => {
    const stopMusic = musicPlayback.mount();
    const stopClock = watchFocusClock();
    return () => { stopMusic(); stopClock(); };
  }, []);
  return null;
}
