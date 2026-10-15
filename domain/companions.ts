import type { CounterId } from "@/domain/indoor";
import { musicTracks } from "@/domain/musicTracks";

export type CompanionOwner = CounterId | "outside" | "bookmark";
export type CompanionTool = "music" | "focus";
export type MusicDevice = "cassette" | "television" | "turntable" | "radio";
export type FocusDevice = "mantel" | "kitchen" | "alarm" | "tea";
export type CompanionArtwork = {
  src: string;
  width: number;
  height: number;
  // Clock art is supplied without hands; these coordinates share its pixel canvas.
  face?: { x: number; y: number; radius: number };
};

export const counterCompanions: Record<CounterId, {
  musicDevice: MusicDevice; musicLabel: string;
  focusDevice: FocusDevice; focusLabel: string; trackIds: string[];
  musicArtwork?: CompanionArtwork;
  focusArtwork?: CompanionArtwork;
}> = {
  grandpa: { musicDevice: "cassette", musicLabel: "旧录音机", focusDevice: "mantel", focusLabel: "旧座钟", trackIds: ["rain-radio", "store-lamp"] },
  sashimi: { musicDevice: "television", musicLabel: "小电视机", focusDevice: "kitchen", focusLabel: "厨房计时器", trackIds: ["rain-radio"] },
  dessert: { musicDevice: "turntable", musicLabel: "唱片机", focusDevice: "alarm", focusLabel: "小闹钟", trackIds: ["store-lamp"] },
  matcha: { musicDevice: "radio", musicLabel: "木壳收音机", focusDevice: "tea", focusLabel: "茶席计时钟", trackIds: ["store-lamp", "rain-radio"] },
};

export function tracksForCounter(counter: CounterId) {
  return counterCompanions[counter].trackIds.flatMap(id => {
    const track = musicTracks.find(track => track.id === id);
    return track ? [track] : [];
  });
}

export function formatFocusTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function companionTriggerId(owner: CompanionOwner, tool: CompanionTool) {
  return `companion-${owner}-${tool}`;
}
