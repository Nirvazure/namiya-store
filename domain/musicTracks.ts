export type MusicTrack = {
  id: string;
  title: string;
  description: string;
  src?: string;
};

export const musicTracks: MusicTrack[] = [
  {
    id: "rain-radio",
    title: "雨夜电台",
    description: "轻微雨声和旧收音机底噪，适合写信或专注。",
  },
  {
    id: "store-lamp",
    title: "店灯未眠",
    description: "低速的温暖合成器循环，像深夜柜台后的灯。",
  },
];
