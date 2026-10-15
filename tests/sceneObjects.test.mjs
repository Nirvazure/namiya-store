import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCalendarPage } from '../domain/calendar.ts';
import { getSceneEnvironment } from '../domain/weather.ts';
import { StreetCalendar } from '../components/scene/StreetCalendar.tsx';
import { CassetteArtwork } from '../components/music/CassettePlayer.tsx';
import { MusicPanel } from '../components/music/MusicPanel.tsx';

test('calendar resolves weekdays, leap days and year boundaries', () => {
  const february = getCalendarPage('2024-02-29');
  assert.equal(february.weekday, '星期四');
  assert.equal(february.day, 29);
  assert.equal(february.month, 2);
  assert.equal(getCalendarPage('2026-02-28').weekday, '星期六');
  const august = getCalendarPage('2026-08-31');
  assert.equal(august.weekday, '星期一');
  assert.equal(getCalendarPage('2027-01-01').weekday, '星期五');
  for (const invalid of ['', '2026-02-29', '2026-13-01', '2026-04-31', '2026-1-1']) {
    assert.equal(getCalendarPage(invalid), undefined);
  }
});

test('calendar follows the weather timezone and falls back to the device date with stale weather', () => {
  const now = Date.parse('2026-12-31T23:59:00Z');
  const weather = {
    weatherCode: 0, temperature: 10, timezone: 'Asia/Tokyo', isDay: true,
    observedAt: now, fetchedAt: now,
    solarDays: [{ date: '2027-01-01', sunrise: null, sunset: null }],
  };
  const local = getSceneEnvironment(now, weather);
  assert.equal(local.localDate, '2027-01-01');
  assert.equal(local.localTime, '08:59');
  assert.equal(getCalendarPage(local.localDate).weekday, '星期五');
  const expired = getSceneEnvironment(now, { ...weather, observedAt: now - 30 * 60_000 });
  const device = new Date(now);
  const deviceDate = `${device.getFullYear()}-${String(device.getMonth() + 1).padStart(2, '0')}-${String(device.getDate()).padStart(2, '0')}`;
  assert.equal(expired.localDate, deviceDate);
  assert.equal(expired.timeSource, '本地时间');
  const before = new Date(2026, 11, 31, 23, 59).getTime();
  assert.equal(getSceneEnvironment(before).localDate, '2026-12-31');
  assert.equal(getSceneEnvironment(before + 60_000).localDate, '2027-01-01');
});

test('paper calendar reserves a placeholder and announces one complete date', () => {
  const pending = renderToStaticMarkup(createElement(StreetCalendar));
  assert.doesNotMatch(pending, /<time/);
  const html = renderToStaticMarkup(createElement(StreetCalendar, { date: '2026-10-15' }));
  assert.match(html, /dateTime="2026-10-15"/);
  assert.match(html, /2026年10月15日，星期四/);
  assert.equal((html.match(/<time/g) ?? []).length, 1);
  assert.doesNotMatch(html, /checkbox|night-mode-toggle|Lunar|<b>/);
});

test('cassette carries the real play state and only appears in grandpa music controls', () => {
  const draw = props => renderToStaticMarkup(createElement(CassetteArtwork, props));
  assert.match(draw({ playing: true, title: '店灯未眠' }), /data-playing="true"/);
  assert.match(draw({ playing: false, title: '雨夜电台' }), /data-playing="false"/);
  assert.match(draw({ playing: true, title: '店灯未眠' }), /店灯未眠/);
  assert.doesNotMatch(draw({ playing: false, title: '雨夜电台' }), /<audio|autoplay|2×30min/);
  for (const counter of ['grandpa', 'sashimi', 'dessert', 'matcha']) {
    const html = renderToStaticMarkup(createElement(MusicPanel, { counter }));
    assert.equal(html.includes('旧录音机播放器'), counter === 'grandpa');
    assert.equal((html.match(/aria-label="播放音乐"/g) ?? []).length, 1);
    assert.equal((html.match(/type="range"/g) ?? []).length, 1);
  }
});
