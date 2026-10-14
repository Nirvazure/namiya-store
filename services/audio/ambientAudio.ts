/** A small, local soundscape engine. Created only after a playback gesture. */
export class AmbientAudio {
  private context: AudioContext;
  private output: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private trackId = "";

  constructor() {
    if (typeof window.AudioContext !== "function") {
      throw new Error("Audio playback is unavailable");
    }
    this.context = new window.AudioContext();
    this.output = this.context.createGain();
    this.output.gain.value = 0;
    this.output.connect(this.context.destination);
  }

  async play(trackId: string, volume: number) {
    // resume is called during the user's click, before awaiting anything else.
    await this.context.resume();
    if (this.context.state !== "running") {
      throw new Error("Audio playback could not start");
    }
    this.setTrack(trackId);
    this.setVolume(volume);
  }

  setVolume(volume: number) {
    this.output.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)) * 0.32,
      this.context.currentTime,
      0.08,
    );
  }

  setTrack(trackId: string) {
    if (this.trackId === trackId) return;
    this.clearSources();
    this.trackId = trackId;
    if (trackId === "store-lamp") this.createLamplight();
    else this.createRain();
  }

  pause() {
    return this.context.suspend();
  }

  dispose() {
    this.clearSources();
    this.output.disconnect();
    return this.context.close();
  }

  private clearSources() {
    this.sources.forEach((source) => {
      source.stop();
      source.disconnect();
    });
    this.nodes.forEach((node) => node.disconnect());
    this.sources = [];
    this.nodes = [];
  }

  private createRain() {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 8, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1800;
    lowpass.Q.value = 0.4;
    const highpass = this.context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 180;
    source.connect(lowpass).connect(highpass).connect(this.output);
    source.start();
    this.sources.push(source);
    this.nodes.push(lowpass, highpass);
  }

  private createLamplight() {
    [130.81, 164.81, 196].forEach((frequency, index) => {
      const tone = this.context.createOscillator();
      tone.type = "sine";
      tone.frequency.value = frequency;
      tone.detune.value = index * 2 - 2;
      const envelope = this.context.createGain();
      envelope.gain.value = 0.12;
      const drift = this.context.createOscillator();
      drift.frequency.value = 0.06 + index * 0.017;
      const depth = this.context.createGain();
      depth.gain.value = 0.035;
      drift.connect(depth).connect(envelope.gain);
      tone.connect(envelope).connect(this.output);
      tone.start();
      drift.start();
      this.sources.push(tone, drift);
      this.nodes.push(envelope, depth);
    });
  }
}
