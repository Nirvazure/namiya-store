// Run against the dev server with PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE if needed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const origin = process.env.INDOOR_TEST_URL || 'http://localhost:3000';
const errors = [];
const passed = [];

async function enter(context) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.locator('.shop-entry-door').click();
  await page.locator('#indoor-scene.indoor-is-active').waitFor();
  await page.locator('.indoor-back').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#indoor-scene').inert);
  return page;
}

async function position(page) {
  return page.locator('.indoor-scroller').evaluate(el => el.scrollLeft / el.clientWidth);
}

async function centered(page, index, label) {
  assert.ok(Math.abs(await position(page) - index) < 0.002, label);
  assert.equal(await page.locator('.indoor-footer nav button').nth(index).getAttribute('aria-current'), 'location');
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await enter(desktop);
  // Assert in the same task as the click, before any animation can run.
  const immediate = await page.locator('.indoor-footer nav button').nth(2).evaluate(button => {
    button.click();
    const el = document.querySelector('.indoor-scroller');
    return el.scrollLeft / el.clientWidth;
  });
  assert.equal(immediate, 2, 'Counter buttons must center immediately');
  await centered(page, 2, 'Button selects dessert');

  async function wheel(deltaX, deltaY, deltaMode = 0) {
    return page.locator('.indoor-scroller').evaluate((el, values) => {
      el.dispatchEvent(new WheelEvent('wheel', { ...values, bubbles: true, cancelable: true }));
      return el.scrollLeft / el.clientWidth;
    }, { deltaX, deltaY, deltaMode });
  }
  const partial = await wheel(0, 150);
  assert.ok(partial > 2 && partial < 2.2, 'Wheel input follows the gesture below the 20% threshold');
  await page.waitForTimeout(400);
  await centered(page, 2, 'Small wheel gesture returns to current center');
  assert.equal(await wheel(0, 400), 3, 'Wheel snaps as soon as threshold is reached');
  await wheel(0, -900);
  await centered(page, 3, 'Same wheel gesture cannot reverse or skip');
  await page.waitForTimeout(400);
  assert.equal(await wheel(-500, 0), 2, 'Horizontal trackpad uses the same snap');
  await page.waitForTimeout(400);
  assert.equal(await wheel(0, -1, 2), 1, 'Page-mode wheel still moves one counter');
  await page.waitForTimeout(400);
  assert.equal(await wheel(0, -20, 1), 0, 'Line-mode wheel uses threshold');
  await page.waitForTimeout(400);
  await wheel(0, -2000);
  await page.waitForTimeout(400);
  await centered(page, 0, 'First counter clamps to its center');
  const zoomAllowed = await page.locator('.indoor-scroller').evaluate(el => {
    const event = new WheelEvent('wheel', { deltaY: 1000, ctrlKey: true, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return !event.defaultPrevented;
  });
  assert.equal(zoomAllowed, true, 'Browser zoom and trackpad pinch must stay available');
  await centered(page, 0, 'Zoom gesture does not change counter');
  await page.locator('.indoor-scroller').hover();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(50);
  await centered(page, 1, 'Real wheel input centers the next counter');
  passed.push('immediate buttons; vertical/horizontal wheel, idle reset, gesture lock, delta modes and edges');

  await page.locator('.indoor-footer nav button').nth(2).focus();
  await page.keyboard.press('Enter');
  await centered(page, 2, 'Keyboard can select a counter');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(100);
  await centered(page, 2, 'Resize keeps selected counter centered');
  await page.getByRole('button', { name: '看看菜单', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await wheel(0, 2000);
  await centered(page, 2, 'Dialog blocks scene movement');
  await page.getByRole('button', { name: '关闭对话' }).click();
  await page.getByRole('button', { name: '返回街角' }).click();
  await page.locator('.shop-entry-door').click();
  await page.waitForFunction(() => !document.querySelector('#indoor-scene').inert);
  await centered(page, 2, 'Re-entry remembers selected counter');
  passed.push('resize, dialog blocking and re-entry');
  await desktop.close();

  for (const reducedMotion of ['no-preference', 'reduce']) {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion });
    const phone = await enter(mobile);
    const client = await mobile.newCDPSession(phone);
    const box = await phone.locator('.indoor-scroller').boundingBox();
    const x = 320, y = box.y + 100;
    async function touch(type, offset = 0) {
      await client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x: x - offset, y }] });
    }
    await touch('touchStart');
    await touch('touchMove', 60);
    assert.ok(await position(phone) > 0 && await position(phone) < .2, 'Touch follows finger below the 20% threshold');
    await touch('touchEnd');
    await centered(phone, 0, 'Short swipe returns to current center');
    await touch('touchStart');
    await touch('touchMove', 80);
    await centered(phone, 1, 'Touch snaps before finger is lifted at 20%');
    await touch('touchMove', 300);
    await centered(phone, 1, 'Continuing touch cannot skip another counter');
    await touch('touchEnd');
    await phone.waitForTimeout(400);
    await centered(phone, 1, 'No native momentum after release');
    await touch('touchStart');
    await touch('touchMove', -80);
    await centered(phone, 0, 'Reverse swipe centers previous counter');
    await touch('touchEnd');
    await touch('touchStart');
    await touch('touchMove', 60);
    await touch('touchCancel');
    await centered(phone, 0, 'Cancelled touch returns to current center');
    // A tap is still a click after a gesture; swipes must not activate hotspots.
    await phone.getByRole('button', { name: '和浪矢爷爷聊聊', exact: true }).tap();
    await phone.getByRole('dialog').waitFor();
    await phone.getByRole('button', { name: '关闭对话' }).tap();
    await phone.getByRole('button', { name: '写一封信', exact: true }).tap();
    await phone.getByRole('dialog').waitFor();
    await phone.getByRole('button', { name: '收起信纸，保留草稿' }).tap();
    passed.push(`mobile touch threshold, release, reverse, cancellation and hotspot taps (${reducedMotion})`);
    await mobile.close();
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(JSON.stringify({ passed, browserErrors: errors }, null, 2));
} finally {
  await browser.close();
}
