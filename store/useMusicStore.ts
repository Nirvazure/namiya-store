"use client";

import { create } from "zustand";
import { musicTracks } from "@/domain/musicTracks";

type MusicStore = {
  trackId: string;
  isPlaying: boolean;
  volume: number;
  panelOpen: boolean;
  togglePanel: () => void;
  setTrack: (trackId: string) => void;
  togglePlaying: () => void;
  setVolume: (volume: number) => void;
};

export const useMusicStore = create<MusicStore>((set) => ({
  trackId: musicTracks[0].id,
  isPlaying: false,
  volume: 0.6,
  panelOpen: false,
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  setTrack: (trackId) => set({ trackId }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setVolume: (volume) => set({ volume }),
}));
