import { musicTracks } from "@/domain/musicTracks";
import { AmbientAudio } from "@/services/audio/ambientAudio";
import { useMusicStore } from "@/store/useMusicStore";

type Engine = Pick<AmbientAudio, "play" | "pause" | "setVolume" | "dispose">;

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
        await audio.play(trackId ?? state.trackId, state.volume);
        if (generation === version && store.getState().volume !== state.volume) audio.setVolume(store.getState().volume);
      }
      if (generation === version) store.setState({ trackId: trackId ?? state.trackId, isPlaying: !pausing });
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
        if (state.volume !== previous.volume) audio?.setVolume(state.volume);
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
