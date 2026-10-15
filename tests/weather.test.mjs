import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSceneEnvironment, classifyWeather } from '../domain/weather.ts';
import { GET } from '../app/api/weather/route.ts';

const at = value => Date.parse(`2026-10-15T${value}:00+08:00`);
const snapshot = {
  weatherCode: 61, temperature: 18, timezone: 'Asia/Shanghai', isDay: true,
  observedAt: at('12:00'), fetchedAt: at('12:00'),
  solarDays: [{ date: '2026-10-15', sunrise: at('06:00'), sunset: at('18:00') }],
};

test('solar boundaries use location time and work across UTC dates', () => {
  for (const [time, expected] of [['05:29','night'], ['05:30','morning'], ['06:59','morning'], ['07:00','day'], ['16:59','day'], ['17:00','dusk'], ['18:29','dusk'], ['18:30','night']]) {
    const now = at(time);
    assert.equal(getSceneEnvironment(now, { ...snapshot, fetchedAt: now, observedAt: now }).phase, expected, time);
  }
});

test('weather expires after 30 minutes even if an old observation is newly fetched', () => {
  assert.equal(getSceneEnvironment(at('12:29'), snapshot).condition, 'rain');
  assert.equal(getSceneEnvironment(at('12:30'), snapshot).condition, 'unknown');
  assert.equal(getSceneEnvironment(at('12:31'), { ...snapshot, fetchedAt: at('12:31') }).condition, 'unknown');
});

test('fallback uses device hours and never claims live weather', () => {
  for (const [hour, expected] of [[4,'night'], [5,'morning'], [8,'day'], [17,'dusk'], [19,'night']]) {
    const result = getSceneEnvironment(new Date(2026, 9, 15, hour).getTime());
    assert.equal(result.phase, expected);
    assert.equal(result.condition, 'unknown');
    assert.match(result.label, /本地时间/);
    assert.equal(result.weatherLabel, '天气暂不可用');
    assert.equal(result.timeSource, '本地时间');
  }
});

test('display time follows weather timezone independently of device timezone', () => {
  const now = at('12:00');
  const result = getSceneEnvironment(now, { ...snapshot, timezone: 'Pacific/Honolulu', solarDays: [{ date: '2026-10-14', sunrise: null, sunset: null }] });
  assert.equal(result.localTime, '18:00');
  assert.equal(result.weatherLabel, '小雨');
  assert.equal(result.timeSource, '当地时间');
});

test('polar days and nights use the upstream daylight flag', () => {
  const now = at('12:01');
  for (const isDay of [true, false]) {
    assert.equal(getSceneEnvironment(now, { ...snapshot, isDay, solarDays: [{ date: '2026-10-15', sunrise: null, sunset: null }] }).phase, isDay ? 'day' : 'night');
  }
});

test('missing solar date falls back instead of using yesterday sunrise', () => {
  const now = at('12:01');
  assert.equal(getSceneEnvironment(now, { ...snapshot, solarDays: [{ date: '2026-10-14', sunrise: at('06:00'), sunset: at('18:00') }] }).condition, 'unknown');
});

test('twilight windows can extend over local midnight from adjacent dates', () => {
  const previousDusk = Date.parse('2026-10-16T00:10:00+08:00');
  const nextDawn = Date.parse('2026-10-15T23:50:00+08:00');
  const previous = { date: '2026-10-15', sunrise: at('06:00'), sunset: at('23:50') };
  const next = { date: '2026-10-16', sunrise: Date.parse('2026-10-16T00:10:00+08:00'), sunset: Date.parse('2026-10-16T18:00:00+08:00') };
  const today = { date: '2026-10-15', sunrise: at('00:10'), sunset: at('23:00') };
  assert.equal(getSceneEnvironment(previousDusk, { ...snapshot, observedAt: previousDusk, fetchedAt: previousDusk, solarDays: [previous, { ...next, sunrise: Date.parse('2026-10-16T06:00:00+08:00') }] }).phase, 'dusk');
  assert.equal(getSceneEnvironment(nextDawn, { ...snapshot, observedAt: nextDawn, fetchedAt: nextDawn, solarDays: [today, next] }).phase, 'morning');
});

test('all supported WMO conditions include freezing rain, showers, fog and thunder', () => {
  for (const [codes, expected] of [[[0,1],'clear'], [[2],'cloudy'], [[3],'overcast'], [[45,48],'fog'], [[51,53,55,56,57,61,63,65,66,67,80,81,82],'rain'], [[71,73,75,77,85,86],'snow'], [[95,96,97,99],'storm'], [[999],'unknown']]) {
    for (const code of codes) assert.equal(classifyWeather(code).condition, expected, `${code}`);
  }
});

test('weather endpoint rejects missing, empty and out-of-range coordinates', async () => {
  for (const query of ['', '?latitude=&longitude=0', '?latitude=91&longitude=0', '?latitude=0&longitude=-181', '?latitude=NaN&longitude=0']) {
    assert.equal((await GET(new Request(`http://localhost/api/weather${query}`))).status, 400);
  }
});

const upstream = {
  timezone: 'Asia/Shanghai', utc_offset_seconds: 28800,
  current: { time: at('12:00') / 1000, weather_code: 61, temperature_2m: 18, is_day: 1 },
  daily: { time: [at('00:00') / 1000], sunrise: [at('06:00') / 1000], sunset: [at('18:00') / 1000] },
};

test('weather endpoint normalizes provider timestamps and preserves zero coordinates', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('latitude'), '0');
    assert.equal(params.get('longitude'), '0');
    assert.equal(params.get('timeformat'), 'unixtime');
    assert.equal(params.get('past_days'), '1');
    return Response.json(upstream);
  });
  const response = await GET(new Request('http://localhost/api/weather?latitude=0&longitude=0'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.observedAt, at('12:00'));
  assert.deepEqual(data.solarDays, snapshot.solarDays);
  assert.equal(data.weatherCode, 61);
  assert.equal(data.temperature, 18);
});

test('weather endpoint fails safely on upstream errors and malformed data', async t => {
  for (const response of [new Response('', { status: 500 }), Response.json({}), Response.json({ ...upstream, current: { ...upstream.current, temperature_2m: null } })]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => response);
    assert.equal((await GET(new Request('http://localhost/api/weather?latitude=30&longitude=120'))).status, 502);
    mock.mock.restore();
  }
});

test('weather endpoint bounds an upstream timeout', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  assert.equal((await GET(new Request('http://localhost/api/weather?latitude=30&longitude=120'))).status, 504);
});
