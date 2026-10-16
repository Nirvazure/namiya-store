import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMusicStore } from "@/store/useMusicStore";
import { usePomodoroStore } from "@/store/usePomodoroStore";
import { createMusicPlayback } from "@/services/audio/musicPlayback";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  useMusicStore.setState(useMusicStore.getInitialState());
  usePomodoroStore.setState(usePomodoroStore.getInitialState());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("companion integration after the scene update", () => {
  it("restores the absolute focus deadline after refresh and completes after background time", () => {
    vi.useFakeTimers(); vi.setSystemTime(1_000_000);
    usePomodoroStore.getState().start();
    vi.setSystemTime(1_090_000);
    usePomodoroStore.setState(usePomodoroStore.getInitialState());
    usePomodoroStore.getState().hydrate();
    expect(usePomodoroStore.getState().remainingSeconds).toBe(1410);
    expect(usePomodoroStore.getState().isRunning).toBe(true);
    vi.setSystemTime(3_000_000);
    usePomodoroStore.getState().tick();
    expect(usePomodoroStore.getState()).toMatchObject({ remainingSeconds: 0, isRunning: false, deadline: null });
  });
  it("persists paused focus without subtracting wall time", () => {
    vi.useFakeTimers(); vi.setSystemTime(1_000_000);
    usePomodoroStore.getState().start();
    vi.setSystemTime(1_090_000);
    usePomodoroStore.getState().pause();
    vi.setSystemTime(2_000_000);
    usePomodoroStore.setState(usePomodoroStore.getInitialState());
    usePomodoroStore.getState().hydrate();
    expect(usePomodoroStore.getState()).toMatchObject({ remainingSeconds: 1410, isRunning: false, deadline: null });
  });
  it("restores each shop's chosen soundscape without auto-playing", () => {
    const music = useMusicStore.getState();
    music.applyShopDefault("human-a", "rain-radio");
    music.setTrack("store-lamp");
    music.applyShopDefault("human-b", "rain-radio");
    expect(useMusicStore.getState().trackId).toBe("rain-radio");
    useMusicStore.setState(useMusicStore.getInitialState());
    useMusicStore.getState().hydrate();
    useMusicStore.getState().applyShopDefault("human-a", "rain-radio");
    expect(useMusicStore.getState()).toMatchObject({ trackId: "store-lamp", isPlaying: false });
  });
  it("ducks the shared engine for the current voice and restores the visitor's volume", async () => {
    const engine = { play: vi.fn(async () => {}), pause: vi.fn(async () => {}), setVolume: vi.fn(), setTrack: vi.fn(), dispose: vi.fn(async () => {}) };
    const playback = createMusicPlayback(() => engine);
    const stop = playback.mount();
    await playback.play("rain-radio");
    useMusicStore.getState().setDucked(true, "voice-a");
    expect(engine.setVolume).toHaveBeenLastCalledWith(.12);
    useMusicStore.getState().setDucked(true, "voice-b");
    useMusicStore.getState().setDucked(false, "voice-a");
    expect(useMusicStore.getState().ducked).toBe(true);
    useMusicStore.getState().setVolume(.5);
    expect(engine.setVolume).toHaveBeenLastCalledWith(.1);
    useMusicStore.getState().setDucked(false, "voice-b");
    expect(engine.setVolume).toHaveBeenLastCalledWith(.5);
    expect(useMusicStore.getState().volume).toBe(.5);
    stop();
  });
  it("does not save a late playback selection into the next shop", async () => {
    let finish!: () => void;
    const engine = { play: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })), pause: vi.fn(async () => {}), setVolume: vi.fn(), setTrack: vi.fn(), dispose: vi.fn(async () => {}) };
    const playback = createMusicPlayback(() => engine);
    const stop = playback.mount();
    useMusicStore.getState().applyShopDefault("human-a", "rain-radio");
    const pending = playback.play("store-lamp");
    useMusicStore.getState().applyShopDefault("human-b", "rain-radio");
    finish(); await pending;
    expect(useMusicStore.getState()).toMatchObject({ shopId: "human-b", trackId: "rain-radio", tracks: {} });
    expect(engine.setTrack).toHaveBeenLastCalledWith("rain-radio");
    stop();
  });
});
