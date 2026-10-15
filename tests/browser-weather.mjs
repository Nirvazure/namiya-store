// Optional browser checks: provide Playwright and a running app, no product dependency required.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const origin = process.env.WEATHER_TEST_URL || 'http://localhost:3000';
const screenshots = process.env.WEATHER_SCREENSHOT_DIR;
const errors = [];
const passed = [];
if (screenshots) await mkdir(screenshots, { recursive: true });

function observe(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('502')) errors.push(message.text()); });
}

function fixture(time, weatherCode) {
  const now = Date.parse(`2026-10-15T${time}:00+08:00`);
  return { weatherCode, temperature: 18, timezone: 'Asia/Shanghai', isDay: time >= '06:00' && time < '18:00', observedAt: now, fetchedAt: now,
    solarDays: [{ date: '2026-10-15', sunrise: Date.parse('2026-10-15T06:00:00+08:00'), sunset: Date.parse('2026-10-15T18:00:00+08:00') }] };
}

async function capture(page, name) {
  if (!screenshots) return;
  await page.waitForTimeout(1600); // Let the atmosphere's opacity transitions settle for visual review.
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}

try {
  // Deliberately use a device timezone different from the weather location.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Los_Angeles', geolocation: { latitude: 31.23, longitude: 121.47 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  observe(page);
  await page.addInitScript(() => {
    window.locationRequests = 0;
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (...args) => { window.locationRequests++; return original(...args); };
  });
  let current;
  await page.route('**/api/weather?**', route => route.fulfill({ json: current }));
  for (const [phase, time] of [['morning','06:15'], ['day','12:00'], ['dusk','17:30'], ['night','22:00']]) {
    for (const [condition, code] of [['clear',0], ['cloudy',2], ['overcast',3], ['rain',61], ['snow',71], ['fog',45], ['storm',95]]) {
      current = fixture(time, code);
      await page.clock.setSystemTime(current.observedAt);
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.waitForFunction(({ phase, condition }) => {
        const scene = document.querySelector('.interactive-street');
        return scene?.dataset.phase === phase && scene?.dataset.weather === condition;
      }, { phase, condition });
      assert.equal(await page.locator('.scene-weather-status').evaluate(el => el.tagName), 'SPAN');
      assert.equal(await page.locator('.ambience-toggle').count(), 0);
      assert.equal(await page.evaluate(() => window.locationRequests), 1, 'Strict Mode must not request location twice');
      for (const layer of ['.weather-wash', '.weather-mist', '.weather-precipitation']) {
        assert.equal(await page.locator(layer).evaluate(el => getComputedStyle(el).pointerEvents), 'none');
      }
      if (phase === 'night' && ['overcast','rain','snow','fog','storm'].includes(condition)) {
        // Disable transitions for a deterministic final computed-style assertion.
        await page.addStyleTag({ content: '.ambient-stars { transition: none !important; }' });
        assert.equal(await page.locator('.ambient-stars').evaluate(el => getComputedStyle(el).opacity), '0');
      }
      passed.push(`${phase}/${condition}`);
      if ((condition === 'clear' && phase !== 'night') || (phase === 'night' && condition === 'storm')) await capture(page, `${phase}-${condition}`);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  current = fixture('22:00', 71);
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.interactive-street')?.dataset.weather === 'snow');
  const bounds = await page.locator('.scene-weather-status').boundingBox();
  const brand = await page.locator('.store-brand').boundingBox();
  assert.ok(bounds.x >= brand.x + brand.width && bounds.x + bounds.width <= 390);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await capture(page, 'mobile-night-snow');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.weather-precipitation').evaluate(el => getComputedStyle(el).display), 'none');
  await page.getByRole('button', { name: '点击邮箱，取一张信纸', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('写下你的心事').fill('今晚的雪，让人想写一封信。');
  await page.getByRole('button', { name: '收起信纸，保留草稿' }).click();
  await page.getByRole('button', { name: '听一会儿', exact: true }).click();
  await page.getByRole('button', { name: '关闭音乐面板' }).click();
  await page.getByRole('button', { name: '专注片刻', exact: true }).click();
  await page.getByRole('button', { name: '关闭番茄钟面板' }).click();
  await page.route('**/api/letters/reply', async route => {
    assert.equal(route.request().postDataJSON().body, '今晚的雪，让人想写一封信。');
    await route.fulfill({ json: { letterId: 'weather-regression', characterId: 'grandpa', content: '信已经收到，窗里的灯为你亮着。', createdAt: new Date(current.observedAt).toISOString(), source: 'mock' } });
  });
  await page.getByRole('button', { name: '点击邮箱，取一张信纸', exact: true }).click();
  await page.getByRole('button', { name: '折好信纸' }).click();
  await page.getByRole('button', { name: '点击邮箱，投递这封信', exact: true }).click();
  await page.getByRole('button', { name: '邮箱有回信，点击取信', exact: true }).click();
  await page.getByText('信已经收到，窗里的灯为你亮着。', { exact: true }).waitFor();
  await page.getByRole('button', { name: '收好这封信' }).click();
  await page.locator('.shop-entry-door').click();
  await page.locator('#indoor-scene.indoor-is-active').waitFor();
  passed.push('mobile layout, reduced motion, letter delivery/reply, music, pomodoro and indoor entry');
  await context.close();

  const denied = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' });
  const fallback = await denied.newPage();
  observe(fallback);
  await fallback.clock.setSystemTime(Date.parse('2026-10-15T19:30:00+08:00'));
  await fallback.route('**/api/weather?**', () => { throw new Error('Denied location must not request weather'); });
  await fallback.goto(origin, { waitUntil: 'networkidle' });
  await fallback.waitForFunction(() => document.querySelector('.scene-weather-status')?.textContent.includes('夜晚 · 本地时间'));
  assert.equal(await fallback.locator('.weather-credit').count(), 0);
  await capture(fallback, 'mobile-location-denied');
  passed.push('denied location uses local device time');
  await denied.close();

  assert.deepEqual(errors, [], 'Browser must not have runtime or hydration errors');
  console.log(JSON.stringify({ passed, browserErrors: errors, screenshots }, null, 2));
} catch (error) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      console.error('Browser failure state:', await page.locator('body').innerText().catch(() => 'page closed'));
      if (screenshots) await page.screenshot({ path: path.join(screenshots, 'failure.png'), fullPage: true }).catch(() => {});
    }
  }
  throw error;
} finally {
  await browser.close();
}
