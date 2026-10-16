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
  const now = Date.parse(`2026-10-15T${time}:00+09:00`);
  return { weatherCode, temperature: 18, timezone: 'Asia/Tokyo', isDay: time >= '06:00' && time < '18:00', observedAt: now, fetchedAt: now,
    solarDays: [{ date: '2026-10-15', sunrise: Date.parse('2026-10-15T06:00:00+09:00'), sunset: Date.parse('2026-10-15T18:00:00+09:00') }] };
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
  await context.route('**/api/me', route => route.fulfill({ json: { user: null, configured: false, myShopId: null } }));
  await context.route('**/api/shops', route => route.fulfill({ json: { shops: [], nextCursor: null } }));
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
      assert.equal(await page.locator('.scene-local-time').evaluate(el => el.tagName), 'P');
      assert.equal(await page.locator('.ambience-toggle').count(), 0);
      assert.equal(await page.evaluate(() => window.locationRequests), 0, 'Official shop must not request visitor location');
      assert.equal(await page.locator('.scene-place-name').textContent(), '日本大分县丰后高田市');
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
  const bounds = await page.locator('.scene-local-time').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await capture(page, 'mobile-night-snow');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.weather-precipitation').evaluate(el => getComputedStyle(el).display), 'none');
  await page.getByRole('button', { name: '点击邮箱，取一张信纸', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('写下你的心事').fill('今晚的雪，让人想写一封信。');
  await page.getByRole('button', { name: '收起信纸，保留草稿' }).click();
  await page.locator('.music-dock-summary').click();
  await page.getByRole('button', { name: '收起控制' }).click();
  await page.locator('.focus-bookmark').click();
  await page.getByRole('button', { name: '收起控制' }).click();
  await page.getByRole('button', { name: '点击邮箱，取一张信纸', exact: true }).click();
  await page.getByRole('button', { name: '折好信纸' }).click();
  await page.getByRole('button', { name: '点击邮箱，投递这封信', exact: true }).click();
  await page.getByRole('dialog', { name: '让心事有处寄达' }).waitFor();
  await page.getByRole('button', { name: '关闭窗口' }).click();
  await page.locator('.shop-entry-door').click();
  await page.locator('#indoor-scene.indoor-is-active').waitFor();
  passed.push('mobile layout, reduced motion, draft retention, login before delivery, music, pomodoro and indoor entry');
  await context.close();

  const denied = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' });
  const fallback = await denied.newPage();
  observe(fallback);
  await denied.route('**/api/me', route => route.fulfill({ json: { user: null, configured: false, myShopId: null } }));
  await denied.route('**/api/shops', route => route.fulfill({ json: { shops: [], nextCursor: null } }));
  await fallback.clock.setSystemTime(Date.parse('2026-10-15T19:30:00+08:00'));
  await fallback.route('**/api/weather?**', route => route.fulfill({ status: 502, json: { error: 'Weather unavailable' } }));
  await fallback.goto(origin, { waitUntil: 'networkidle' });
  await fallback.waitForFunction(() => document.querySelector('.scene-local-time')?.textContent.includes('夜晚 · 当地时间'));
  assert.equal(await fallback.locator('.scene-place-name').textContent(), '日本大分县丰后高田市');
  assert.match(await fallback.locator('.scene-local-time').textContent(), /20:30/);
  assert.equal(await fallback.locator('.scene-data-credit a').count(), 0);
  await capture(fallback, 'mobile-location-denied');
  passed.push('official shop retains Bungotakada and Tokyo time without GPS or weather');
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
