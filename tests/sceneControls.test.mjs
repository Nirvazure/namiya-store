import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UserCenterEntry } from '../components/scene/UserCenterEntry.tsx';
import { FocusBookmark } from '../components/companions/FocusBookmark.tsx';
import { usePomodoroStore } from '../store/usePomodoroStore.ts';
import { useCompanionStore } from '../store/useCompanionStore.ts';
import { MusicDock } from '../components/music/MusicDock.tsx';
import { MusicDetails } from '../components/music/MusicControls.tsx';
import { useMusicStore } from '../store/useMusicStore.ts';

test('account entry shows a single login or nickname with a real callback', () => {
  const unavailable = renderToStaticMarkup(createElement(UserCenterEntry));
  assert.match(unavailable, /disabled=""/);
  assert.match(unavailable, /登录/);
  assert.doesNotMatch(unavailable, /用户中心|暂未开放/);
  const available = renderToStaticMarkup(createElement(UserCenterEntry, { user: { nickname: '小林' }, onOpenAccount() {} }));
  assert.doesNotMatch(available, /disabled|暂未开放/);
  assert.match(available, /小林/);
  assert.equal((available.match(/class="user-center-entry"/g) || []).length, 1);
});

test('shared music dock exposes details and playback across scenes, and hiding it preserves audio', t => {
  useCompanionStore.getState().close();
  const previous = useMusicStore.getState();
  t.after(() => useMusicStore.setState(previous));
  useMusicStore.setState({ isPlaying: true, trackId: 'store-lamp', volume: .35 });
  for (const outside of [true, false]) {
    const html = renderToStaticMarkup(createElement(MusicDock, { outside, hidden: false }));
    assert.match(html, /aria-label="音乐播放栏"/);
    assert.match(html, /打开音乐详情与音量/);
    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(html, /<audio|role="progressbar"/);
    const mobileControls = html.slice(html.indexOf('<div class="music-dock-mobile">'));
    assert.doesNotMatch(mobileControls, /type="range"/);
    assert.equal(renderToStaticMarkup(createElement(MusicDock, { outside, hidden: true })), '');
    assert.equal(useMusicStore.getState().isPlaying, true);
    assert.equal(useMusicStore.getState().volume, .35);
    assert.equal(useMusicStore.getState().trackId, 'store-lamp');
  }
  const details = renderToStaticMarkup(createElement(MusicDetails));
  assert.match(details, /type="range"/);
  assert.doesNotMatch(details, /这家店的曲目|companion-track-list/);
});

test('idle focus entry is only outside; hiding it does not reset the shared running timer', () => {
  useCompanionStore.getState().close();
  usePomodoroStore.getState().reset();
  const draw = (outside, hidden = false) => renderToStaticMarkup(createElement(FocusBookmark, { outside, hidden }));
  assert.equal(draw(false), '');
  assert.match(draw(true), /专注片刻/);
  usePomodoroStore.setState({ remainingSeconds: 1476, isRunning: true });
  assert.equal(draw(false, true), '');
  assert.equal(draw(true, true), '');
  assert.equal(usePomodoroStore.getState().remainingSeconds, 1476);
  assert.equal(usePomodoroStore.getState().isRunning, true);
  usePomodoroStore.getState().pause();
  usePomodoroStore.getState().reset();
});
