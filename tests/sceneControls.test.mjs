import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UserCenterEntry } from '../components/scene/UserCenterEntry.tsx';
import { FocusBookmark } from '../components/companions/FocusBookmark.tsx';
import { usePomodoroStore } from '../store/usePomodoroStore.ts';
import { useCompanionStore } from '../store/useCompanionStore.ts';

test('account entry is explicitly unavailable until a real callback is supplied', () => {
  const unavailable = renderToStaticMarkup(createElement(UserCenterEntry));
  assert.match(unavailable, /disabled=""/);
  assert.match(unavailable, /暂未开放/);
  const available = renderToStaticMarkup(createElement(UserCenterEntry, { user: { nickname: '小林' }, onOpenAccount() {} }));
  assert.doesNotMatch(available, /disabled|暂未开放/);
  assert.match(available, /小林/);
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
