import { musicTracks } from "@/domain/musicTracks";
import { AmbientAudio } from "@/services/audio/ambientAudio";
import { useMusicStore } from "@/store/useMusicStore";

type Engine = Pick<AmbientAudio, "play" | "pause" | "setVolume" | "dispose"> & Partial<Pick<AmbientAudio, "setTrack">>;
function effectiveVolume(state: { volume: number; ducked?: boolean }) { return state.volume * (state.ducked ? .2 : 1); }

/** One audio owner, independent of which scene or paper note is visible. */
export function createMusicPlayback(createEngine: () => Engine = () => new AmbientAudio(), store = useMusicStore) {
  let audio: Engine | null = null;
  let generation = 0;

  async function request(trackId?: string) {
    const state = store.getState();
    if (state.starting || (trackId && !musicTracks.some(track => track.id === trackId))) return;
    const version = generation;
    const pausing = !trackId && state.isPlaying;
    store.setState({ starting: true, error: "" });
    try {
      if (pausing) await audio?.pause();
      else {
        // Construct and resume in the playback gesture, never on scene entry.
        audio ??= createEngine();
        await audio.play(trackId ?? state.trackId, effectiveVolume(state));
        if (generation === version && effectiveVolume(store.getState()) !== effectiveVolume(state)) audio.setVolume(effectiveVolume(store.getState()));
      }
      if (generation === version) {
        const current = store.getState();
        if (current.shopId !== state.shopId) {
          // A delayed playback gesture must not overwrite the next shop's preference.
          audio?.setTrack?.(current.trackId);
          store.setState({ isPlaying: !pausing });
        } else {
          const selected = trackId ?? state.trackId;
          if (trackId) current.setTrack?.(selected);
          store.setState({ trackId: selected, isPlaying: !pausing });
        }
      }
    } catch {
      if (generation === version) store.setState({ error: pausing ? "暂时无法暂停，请再试一次。" : "声音暂时没有响起，轻按播放再试一次。" });
    } finally {
      if (generation === version) store.setState({ starting: false });
    }
  }

  return {
    play: (trackId: string) => request(trackId),
    toggle: () => request(),
    mount() {
      const unsubscribe = store.subscribe((state, previous) => {
        if (effectiveVolume(state) !== effectiveVolume(previous)) audio?.setVolume(effectiveVolume(state));
        if (state.trackId !== previous.trackId && !state.starting) audio?.setTrack?.(state.trackId);
      });
      return () => {
        generation++;
        unsubscribe();
        const previous = audio;
        audio = null;
        void previous?.dispose().catch(() => {});
        store.setState({ isPlaying: false, starting: false });
      };
    },
  };
}

export const musicPlayback = createMusicPlayback();
