"use client";

import { create } from "zustand";
import { musicTracks } from "@/domain/musicTracks";

type MusicStore = {
  trackId: string;
  isPlaying: boolean;
  volume: number;
  starting: boolean;
  error: string;
  setVolume: (volume: number) => void;
};

export const useMusicStore = create<MusicStore>((set) => ({
  trackId: musicTracks[0].id,
  isPlaying: false,
  volume: 0.6,
  starting: false,
  error: "",
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
}));
