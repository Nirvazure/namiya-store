"use client";
import { create } from "zustand";
import { musicTracks } from "@/domain/musicTracks";
import { readLocalValue, writeLocalValue } from "@/services/storage/localStorageService";

type MusicPreferences = { volume: number; tracks: Record<string, string> };
type MusicStore = {
  trackId: string; isPlaying: boolean; volume: number; panelOpen: boolean; ducked: boolean; starting: boolean; error: string;
  shopId: string; tracks: Record<string, string>; voiceOwner: string | null;
  hydrate: () => void; applyShopDefault: (shopId: string, trackId: string) => void;
  togglePanel: () => void; setTrack: (trackId: string) => void; togglePlaying: () => void;
  setVolume: (volume: number) => void; setDucked: (ducked: boolean, voiceOwner?: string) => void;
};
const KEY = "namiya.music.v2";
function save(state: MusicStore) { writeLocalValue<MusicPreferences>(KEY, { volume: state.volume, tracks: state.tracks }); }
export const useMusicStore = create<MusicStore>((set, get) => ({
  trackId: musicTracks[0].id, isPlaying: false, volume: .6, panelOpen: false, ducked: false, starting: false, error: "", shopId: "grandpa", tracks: {}, voiceOwner: null,
  hydrate: () => {
    const raw = readLocalValue<Partial<MusicPreferences>>(KEY, {});
    const tracks = raw.tracks && typeof raw.tracks === "object" ? Object.fromEntries(Object.entries(raw.tracks).filter((entry): entry is [string, string] => typeof entry[1] === "string" && musicTracks.some(track => track.id === entry[1]))) : {};
    set({ tracks, trackId: tracks[get().shopId] ?? get().trackId, volume: typeof raw.volume === "number" && Number.isFinite(raw.volume) ? Math.min(1, Math.max(0, raw.volume)) : .6 });
  },
  applyShopDefault: (shopId, trackId) => set(state => ({ shopId, trackId: state.tracks[shopId] ?? (musicTracks.some(track => track.id === trackId) ? trackId : musicTracks[0].id) })),
  togglePanel: () => set(state => ({ panelOpen: !state.panelOpen })),
  setTrack: trackId => { if (!musicTracks.some(track => track.id === trackId)) return; set(state => ({ trackId, tracks: { ...state.tracks, [state.shopId]: trackId } })); save(get()); },
  togglePlaying: () => set(state => ({ isPlaying: !state.isPlaying })),
  setVolume: volume => { if (!Number.isFinite(volume)) return; set({ volume: Math.min(1, Math.max(0, volume)) }); save(get()); },
  setDucked: (ducked, voiceOwner) => { if (ducked) set({ ducked: true, voiceOwner: voiceOwner ?? null }); else if (!voiceOwner || get().voiceOwner === voiceOwner) set({ ducked: false, voiceOwner: null }); },
}));
