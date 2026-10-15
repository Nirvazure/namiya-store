import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusBookmarkState } from '../domain/focusBookmark.ts';
import { fitEdgeNote, fitSideNote } from '../services/scene/companionNote.ts';

test('bookmark distinguishes idle, running, paused and completed without opening controls', () => {
  for (const [remaining, running, status, text] of [[1500, false, 'idle', '专注片刻'], [1476, true, 'running', '24:36'], [1476, false, 'paused', '24:36'], [0, false, 'completed', '已完成']]) {
    const result = focusBookmarkState(remaining, 1500, running);
    assert.equal(result.status, status);
    assert.equal(result.text, text);
    assert.ok(result.progress >= 0 && result.progress <= 1);
    if (status === 'paused') assert.match(result.label, /已暂停/);
  }
  assert.equal(focusBookmarkState(0, 1500, false).progress, 1);
});

test('expanded focus sits left of its visible timer and above the player and navigation', () => {
  for (const view of [
    { left: 0, top: 0, width: 390, height: 844 },
    { left: 0, top: 0, width: 320, height: 568 },
    { left: 20, top: 80, width: 320, height: 300 },
    { left: 0, top: 0, width: 1440, height: 900 },
  ]) {
    for (const bottomControls of [64, 155]) {
      const clearance = Math.min(bottomControls, view.height - 140);
      const anchor = { left: view.left + view.width - 68, top: view.top + view.height - clearance - 76, bottom: view.top + view.height - clearance - 16, width: 68 };
      const size = { width: Math.min(240, anchor.left - view.left - 20), height: Math.min(220, view.height - clearance - 24) };
      const position = fitSideNote(anchor, size, view, clearance);
      assert.ok(position.left >= view.left + 12);
      assert.ok(position.left + size.width <= anchor.left - 8);
      assert.ok(position.top >= view.top + 12);
      assert.ok(position.top + size.height <= view.top + view.height - clearance - 12);
    }
  }
});

test('focus paper aligns to the right edge and clears mobile navigation in offset viewports', () => {
  for (const view of [{ left: 0, top: 0, width: 390, height: 844 }, { left: 20, top: 80, width: 320, height: 300 }]) {
    const clearance = Math.min(108, view.height / 3);
    const size = { width: 240, height: Math.min(220, view.height - clearance - 24) };
    const result = fitEdgeNote(size, view, clearance);
    assert.equal(result.left + size.width, view.left + view.width - 12);
    assert.ok(result.top >= view.top + 12);
    assert.ok(result.top + size.height <= view.top + view.height - clearance - 12);
  }
});
