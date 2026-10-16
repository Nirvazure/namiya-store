import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'zustand/vanilla';
import { counterCompanions, tracksForCounter, formatFocusTime } from '../domain/companions.ts';
import { useCompanionStore } from '../store/useCompanionStore.ts';
import { useMusicStore } from '../store/useMusicStore.ts';
import { usePomodoroStore } from '../store/usePomodoroStore.ts';
import { createMusicPlayback } from '../services/audio/musicPlayback.ts';
import { watchFocusClock } from '../services/scene/focusClock.ts';
import { attachIndoorSnap } from '../services/scene/indoorSnap.ts';
import { fitCompanionNote, watchCompanionNote } from '../services/scene/companionNote.ts';

test('each shop exposes its configured tracks and distinct scene furniture', () => {
  assert.deepEqual(tracksForCounter('sashimi').map(track => track.id), ['rain-radio']);
  assert.deepEqual(tracksForCounter('dessert').map(track => track.id), ['store-lamp']);
  assert.equal(tracksForCounter('grandpa').length, 2);
  assert.equal(tracksForCounter('matcha').length, 2);
  assert.equal(new Set(Object.values(counterCompanions).map(item => item.musicDevice)).size, 4);
  assert.equal(new Set(Object.values(counterCompanions).map(item => item.focusDevice)).size, 4);
  for (const counter of Object.keys(counterCompanions)) {
    assert.ok(tracksForCounter(counter).length);
    assert.equal(tracksForCounter(counter).length, counterCompanions[counter].trackIds.length);
  }
});

test('only one paper note is open, and opening or closing it preserves running state', () => {
  const notes = useCompanionStore.getState();
  useMusicStore.setState({ isPlaying: true, trackId: 'store-lamp' });
  usePomodoroStore.setState({ remainingSeconds: 834, isRunning: true });
  notes.toggle('grandpa', 'music');
  notes.toggle('dessert', 'focus');
  assert.deepEqual(useCompanionStore.getState().active, { owner: 'dessert', tool: 'focus' });
  notes.toggle('dessert', 'focus');
  assert.equal(useCompanionStore.getState().active, null);
  notes.toggle('outside', 'focus');
  notes.close();
  assert.equal(useMusicStore.getState().trackId, 'store-lamp');
  assert.equal(useMusicStore.getState().isPlaying, true);
  assert.equal(usePomodoroStore.getState().remainingSeconds, 834);
  assert.equal(usePomodoroStore.getState().isRunning, true);
  useMusicStore.setState(useMusicStore.getInitialState());
  usePomodoroStore.setState(usePomodoroStore.getInitialState());
});

function musicHarness() {
  const calls = [];
  let engines = 0;
  const store = createStore(() => ({ trackId: 'rain-radio', isPlaying: false, volume: .6, starting: false, error: '' }));
  const engine = {
    async play(id, volume) { calls.push(['play', id, volume]); },
    async pause() { calls.push(['pause']); },
    setVolume(volume) { calls.push(['volume', volume]); },
    async dispose() { calls.push(['dispose']); },
  };
  const playback = createMusicPlayback(() => { engines++; return engine; }, store);
  return { store, calls, engine, playback, engines: () => engines };
}

test('playback is lazy, shares one engine across shops, and keeps volume synchronized', async () => {
  const h = musicHarness();
  const stop = h.playback.mount();
  assert.equal(h.engines(), 0);
  await h.playback.play('store-lamp');
  useCompanionStore.getState().toggle('sashimi', 'music');
  useCompanionStore.getState().close();
  assert.equal(h.store.getState().trackId, 'store-lamp');
  assert.equal(h.calls.length, 1);
  await h.playback.play('rain-radio');
  h.store.setState({ volume: .25 });
  assert.deepEqual(h.calls.at(-1), ['volume', .25]);
  await h.playback.toggle();
  assert.equal(h.store.getState().isPlaying, false);
  await h.playback.toggle();
  assert.equal(h.engines(), 1);
  assert.equal(h.store.getState().isPlaying, true);
  stop();
  assert.deepEqual(h.calls.at(-1), ['dispose']);
  assert.equal(h.store.getState().isPlaying, false);
});

test('failed playback retains the prior selection and can retry; unknown tracks are ignored', async () => {
  const h = musicHarness();
  const stop = h.playback.mount();
  const play = h.engine.play;
  h.engine.play = async () => { throw new Error('blocked'); };
  await h.playback.play('store-lamp');
  assert.equal(h.store.getState().isPlaying, false);
  assert.equal(h.store.getState().trackId, 'rain-radio');
  assert.ok(h.store.getState().error);
  assert.equal(h.store.getState().starting, false);
  h.engine.play = play;
  await h.playback.play('store-lamp');
  assert.equal(h.store.getState().isPlaying, true);
  assert.equal(h.store.getState().error, '');
  const count = h.calls.length;
  await h.playback.play('missing');
  assert.equal(h.calls.length, count);
  stop();
});

test('duplicate playback gestures are ignored and a late response cannot revive a disposed engine', async () => {
  const h = musicHarness();
  let finish;
  h.engine.play = () => new Promise(resolve => { finish = resolve; });
  const stop = h.playback.mount();
  const pending = h.playback.play('store-lamp');
  await h.playback.play('rain-radio');
  assert.equal(h.engines(), 1);
  stop();
  finish();
  await pending;
  assert.equal(h.store.getState().isPlaying, false);
  assert.equal(h.store.getState().starting, false);
});

test('volume changed while audio is starting is retained after playback resumes', async () => {
  const h = musicHarness();
  let finish;
  h.engine.play = () => new Promise(resolve => { finish = resolve; });
  const stop = h.playback.mount();
  const pending = h.playback.play('store-lamp');
  h.store.setState({ volume: .15 });
  finish();
  await pending;
  assert.deepEqual(h.calls.at(-1), ['volume', .15]);
  assert.equal(h.store.getState().volume, .15);
  assert.equal(h.store.getState().isPlaying, true);
  stop();
});

test('focus counts once across note changes, pauses, resets, and ends quietly at zero', t => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: Date.now() });
  usePomodoroStore.setState(usePomodoroStore.getInitialState());
  const stop = watchFocusClock();
  const clock = usePomodoroStore.getState();
  clock.start();
  t.mock.timers.tick(1000);
  assert.equal(usePomodoroStore.getState().remainingSeconds, 1499);
  useCompanionStore.getState().toggle('matcha', 'focus');
  useCompanionStore.getState().close();
  t.mock.timers.tick(2000);
  assert.equal(usePomodoroStore.getState().remainingSeconds, 1497);
  clock.pause();
  t.mock.timers.tick(10000);
  assert.equal(usePomodoroStore.getState().remainingSeconds, 1497);
  clock.reset();
  assert.equal(usePomodoroStore.getState().remainingSeconds, 1500);
  usePomodoroStore.setState({ remainingSeconds: 1 });
  clock.start();
  t.mock.timers.tick(2000);
  assert.equal(usePomodoroStore.getState().remainingSeconds, 0);
  assert.equal(usePomodoroStore.getState().isRunning, false);
  assert.equal(useCompanionStore.getState().active, null);
  assert.equal(formatFocusTime(0), '00:00');
  assert.equal(formatFocusTime(1500), '25:00');
  clock.reset();
  clock.start();
  stop();
  t.mock.timers.tick(2000);
  assert.equal(usePomodoroStore.getState().remainingSeconds, 1500);
  clock.reset();
});

test('music controls bypass wheel and touch navigation while the scene still snaps at 20%', t => {
  class ElementStub extends EventTarget {
    clientWidth = 1000;
    scrollLeft = 0;
    control = false;
    closest() { return this.control ? this : null; }
  }
  const originalElement = globalThis.Element;
  const originalObserver = globalThis.ResizeObserver;
  globalThis.Element = ElementStub;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  t.after(() => { globalThis.Element = originalElement; globalThis.ResizeObserver = originalObserver; });
  const viewport = new ElementStub();
  const input = new ElementStub(); input.control = true;
  let selected = 0;
  const snap = attachIndoorSnap(viewport, { count: 4, initialIndex: 0, isPaused: () => false, onSelect: value => { selected = value; }, onMove() {} });
  t.after(() => snap.destroy());
  function send(type, props, target = viewport) {
    const event = new Event(type, { cancelable: true });
    Object.entries(props).forEach(([key, value]) => Object.defineProperty(event, key, { value }));
    Object.defineProperty(event, 'target', { value: target });
    viewport.dispatchEvent(event);
    return event;
  }
  assert.equal(send('wheel', { deltaX: 400, deltaY: 0, deltaMode: 0 }, input).defaultPrevented, false);
  send('touchstart', { touches: [{ identifier: 1, clientX: 500, clientY: 100 }] }, input);
  send('touchmove', { touches: [{ identifier: 1, clientX: 100, clientY: 100 }] }, input);
  send('touchend', { touches: [] }, input);
  assert.equal(selected, 0);
  send('wheel', { deltaX: 120, deltaY: 0, deltaMode: 0 });
  assert.equal(selected, 0);
  assert.equal(viewport.scrollLeft, 180);
  send('wheel', { deltaX: 20, deltaY: 0, deltaMode: 0 });
  assert.equal(selected, 1);
  assert.equal(viewport.scrollLeft, 1000);
  send('wheel', { deltaX: 2000, deltaY: 0, deltaMode: 0 });
  assert.equal(selected, 1);
});

test('paper notes stay inside small, landscape and offset viewports near either edge', () => {
  for (const viewport of [
    { left: 0, top: 0, width: 320, height: 640 },
    { left: 0, top: 0, width: 667, height: 300 },
    { left: 25, top: 90, width: 375, height: 280 },
  ]) {
    const size = { width: Math.min(272, viewport.width - 24), height: Math.min(245, viewport.height - 24) };
    for (const left of [0, viewport.left + viewport.width - 44]) {
      for (const top of [viewport.top, viewport.top + viewport.height - 44]) {
        const position = fitCompanionNote({ left, top, bottom: top + 44, width: 44 }, size, viewport);
        assert.ok(position.left >= viewport.left + 12);
        assert.ok(position.top >= viewport.top + 12);
        assert.ok(position.left + size.width <= viewport.left + viewport.width - 12);
        assert.ok(position.top + size.height <= viewport.top + viewport.height - 12);
      }
    }
  }
});

test('outside click and Escape dismiss notes; focus returns only to an available trigger', t => {
  class NodeStub extends EventTarget {
    children = [];
    unavailable = false;
    focusCount = 0;
    contains(target) { return target === this || this.children.includes(target); }
    closest() { return this.unavailable ? this : null; }
    focus() { this.focusCount++; }
  }
  const previous = globalThis.Node;
  globalThis.Node = NodeStub;
  t.after(() => { globalThis.Node = previous; });
  const page = new EventTarget();
  const note = new NodeStub();
  const input = new NodeStub();
  const trigger = new NodeStub();
  const outside = new NodeStub();
  note.children.push(input);
  let closes = 0;
  const close = () => { closes++; };
  const stop = watchCompanionNote(note, trigger, close, page);
  function pointer(target) {
    const event = new Event('pointerdown');
    Object.defineProperty(event, 'target', { value: target });
    page.dispatchEvent(event);
  }
  pointer(input);
  pointer(trigger);
  assert.equal(closes, 0);
  pointer(outside);
  assert.equal(closes, 1);
  const escape = new Event('keydown', { cancelable: true });
  Object.defineProperty(escape, 'key', { value: 'Escape' });
  page.dispatchEvent(escape);
  assert.equal(closes, 2);
  assert.equal(escape.defaultPrevented, true);
  page.activeElement = input;
  stop();
  assert.equal(trigger.focusCount, 1);
  pointer(outside);
  assert.equal(closes, 2);
  trigger.unavailable = true;
  watchCompanionNote(note, trigger, close, page)();
  assert.equal(trigger.focusCount, 1);
  trigger.unavailable = false;
  page.activeElement = outside;
  watchCompanionNote(note, trigger, close, page)();
  assert.equal(trigger.focusCount, 1);
  // Resetting an indoor bookmark removes its idle entry; return to the physical clock.
  page.activeElement = input;
  const clock = new NodeStub();
  watchCompanionNote(note, trigger, close, page, clock)();
  assert.equal(clock.focusCount, 1);
  clock.isConnected = false;
  watchCompanionNote(note, trigger, close, page, clock)();
  assert.equal(clock.focusCount, 1);
});
