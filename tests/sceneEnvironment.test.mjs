import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locatePosition, watchSceneEnvironment } from '../services/scene/environment.ts';
import { parsePlaceName } from '../domain/place.ts';

const now = Date.parse('2026-10-15T12:00:00+08:00');
const weather = {
  weatherCode: 61, temperature: 18, timezone: 'Asia/Shanghai', isDay: true,
  observedAt: now, fetchedAt: now,
  solarDays: [{ date: '2026-10-15', sunrise: now - 6 * 3600_000, sunset: now + 6 * 3600_000 }],
};
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function browser(t) {
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  t.after(() => previous ? Object.defineProperty(globalThis, 'document', previous) : delete globalThis.document);
  t.mock.timers.enable({ apis: ['Date', 'setInterval', 'setTimeout'], now });
  return document;
}

test('location denial, unsupported API and timeout resolve without blocking', async () => {
  assert.equal(await locatePosition(null), undefined);
  for (const code of [1, 2, 3]) {
    assert.equal(await locatePosition({ getCurrentPosition(_ok, fail) { fail({ code }); } }), undefined);
  }
  assert.deepEqual(await locatePosition({ getCurrentPosition(ok) { ok({ coords: { latitude: 31, longitude: 121 } }); } }), { latitude: 31, longitude: 121 });
  assert.equal(await locatePosition({ getCurrentPosition(ok) { ok({ coords: { latitude: NaN, longitude: 121 } }); } }), undefined);
});

test('denied location leaves a usable time-only scene with no network requests', async t => {
  browser(t);
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not fetch without location'); });
  const states = [];
  const stop = watchSceneEnvironment(state => states.push(state), Promise.resolve(undefined));
  await flush();
  t.mock.timers.tick(60_000);
  assert.equal(states.at(-1).live, false);
  assert.match(states.at(-1).label, /本地时间/);
  stop();
});

test('refresh retains recent weather on failure, then expires after 30 minutes', async t => {
  browser(t);
  let request = 0;
  t.mock.method(globalThis, 'fetch', async url => url.startsWith('/api/weather') && ++request === 1 ? Response.json(weather) : new Response('', { status: 502 }));
  const states = [];
  const stop = watchSceneEnvironment(state => states.push(state), Promise.resolve({ latitude: 31, longitude: 121 }));
  await flush();
  assert.equal(states.at(-1).condition, 'rain');
  t.mock.timers.tick(15 * 60_000);
  await flush();
  assert.equal(states.at(-1).condition, 'rain');
  t.mock.timers.tick(15 * 60_000);
  await flush();
  assert.equal(states.at(-1).live, false);
  assert.match(states.at(-1).label, /本地时间/);
  stop();
});

test('visible resume refreshes expired weather and cleanup prevents late updates', async t => {
  const document = browser(t);
  let complete;
  let signal;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (!_url.startsWith('/api/weather')) return new Response('', { status: 502 });
    signal = init.signal;
    return new Promise(resolve => { complete = resolve; });
  });
  document.visibilityState = 'hidden';
  const states = [];
  const stop = watchSceneEnvironment(state => states.push(state), Promise.resolve({ latitude: 31, longitude: 121 }));
  await flush();
  assert.equal(complete, undefined);
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(typeof complete, 'function');
  stop();
  assert.equal(signal.aborted, true);
  const count = states.length;
  complete(Response.json(weather));
  await flush();
  t.mock.timers.tick(60_000);
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(states.length, count);
});

test('weather fetch aborts after eight seconds and falls back without losing the scene', async t => {
  browser(t);
  const signals = [];
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signals.push(signal);
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const states = [];
  const stop = watchSceneEnvironment(state => states.push(state), Promise.resolve({ latitude: 31, longitude: 121 }));
  await flush();
  t.mock.timers.tick(8_000);
  await flush();
  assert.equal(states.at(-1).live, false);
  assert.equal(signals.length, 2);
  assert.ok(signals.every(signal => signal.aborted));
  stop();
});

test('place parsing uses returned locality names, handles long names and rejects IP results', () => {
  assert.equal(parsePlaceName({ city: '杭州市', locality: '西湖区' }), '杭州市 · 西湖区');
  assert.equal(parsePlaceName({ city: '京都市', locality: '京都市' }), '京都市');
  assert.equal(parsePlaceName({ city: '', locality: '一个很长且需要在窄屏换行显示的地方名称' }), '一个很长且需要在窄屏换行显示的地方名称');
  for (const data of [null, {}, { city: 123 }, { city: '猜测城市', lookupSource: 'IP Geolocation' }]) assert.equal(parsePlaceName(data), undefined);
});

test('weather and city start in parallel and publish independently when city is slow', async t => {
  browser(t);
  let finishPlace;
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    if (url.startsWith('/api/weather')) return Response.json(weather);
    const params = new URL(url).searchParams;
    assert.equal(params.get('latitude'), '0');
    assert.equal(params.get('longitude'), '0');
    assert.equal(params.get('localityLanguage'), 'zh');
    return new Promise(resolve => { finishPlace = resolve; });
  });
  const states = [];
  const stop = watchSceneEnvironment(state => states.push(state), Promise.resolve({ latitude: 0, longitude: 0 }));
  await flush();
  assert.equal(urls.length, 2);
  assert.equal(states.at(-1).weatherLabel, '小雨');
  assert.equal(states.at(-1).placeName, undefined);
  finishPlace(Response.json({ city: '杭州市', locality: '西湖区' }));
  await flush();
  assert.equal(states.at(-1).placeName, '杭州市 · 西湖区');
  assert.equal(states.at(-1).localTime, '12:00');
  assert.equal(states.at(-1).timeSource, '当地时间');
  t.mock.timers.tick(15 * 60_000);
  await flush();
  assert.equal(urls.filter(url => !url.startsWith('/api/weather')).length, 1);
  stop();
});

test('city succeeds while weather fails, and city failure does not discard valid weather', async t => {
  browser(t);
  for (const cityFails of [true, false]) {
    const mock = t.mock.method(globalThis, 'fetch', async url => {
      const isWeather = url.startsWith('/api/weather');
      return isWeather === cityFails ? Response.json(isWeather ? weather : { city: '京都市', locality: '中京区' }) : new Response('', { status: 502 });
    });
    const states = [];
    const stop = watchSceneEnvironment(state => states.push(state), Promise.resolve({ latitude: 35, longitude: 135 }));
    await flush();
    assert.equal(states.at(-1).live, cityFails);
    assert.equal(states.at(-1).placeName, cityFails ? undefined : '京都市 · 中京区');
    assert.equal(states.at(-1).weatherLabel, cityFails ? '小雨' : '天气暂不可用');
    stop();
    mock.mock.restore();
  }
});

test('effect restart shares one pending GPS result and aborts both requests on unmount', async t => {
  browser(t);
  let resolveLocation;
  const location = new Promise(resolve => { resolveLocation = resolve; });
  const signals = [];
  const completions = [];
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signals.push(signal);
    return new Promise(resolve => completions.push(resolve));
  });
  const states = [];
  let firstUpdates = 0;
  const firstStop = watchSceneEnvironment(() => firstUpdates++, location);
  firstStop();
  const stop = watchSceneEnvironment(state => states.push(state), location);
  resolveLocation({ latitude: 30, longitude: 120 });
  await flush();
  assert.equal(firstUpdates, 1);
  assert.equal(signals.length, 2);
  stop();
  assert.ok(signals.every(signal => signal.aborted));
  const count = states.length;
  completions.forEach(resolve => resolve(Response.json(weather)));
  await flush();
  assert.equal(states.length, count);
});
