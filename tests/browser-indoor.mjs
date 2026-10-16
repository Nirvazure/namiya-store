// Browser regression against the built app, with no Auth/AI credentials required.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const origin = process.env.INDOOR_TEST_URL || "http://127.0.0.1:3100";
const errors = [];
const passed = [];
try {
  for (const width of [375, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/api/me", route => route.fulfill({ json: { user: null, configured: false, myShopId: null } }));
    await context.route("**/api/shops", route => route.fulfill({ json: { shops: [], nextCursor: null } }));
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/shop/grandpa`);
    await page.getByRole("button", { name: "登录", exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector(".user-center-entry")?.disabled);
    assert.equal(await page.locator(".user-center-entry").count(), 1);
    assert.equal(await page.locator(".world-navigation").count(), 0);
    assert.equal(await page.getByText("本机旧信", { exact: true }).count(), 0);
    await page.locator(".shop-entry-door").click();
    await page.waitForFunction(() => { const scene = document.querySelector("#indoor-scene"); return scene && !scene.inert; });
    assert.equal(await page.locator(".indoor-panel").count(), 1);
    assert.equal(await page.locator(".user-center-entry:visible").count(), 1);
    await page.getByRole("button", { name: "和浪矢爷爷聊聊", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "关闭对话" }).click();
    await page.getByRole("button", { name: "写一封信", exact: true }).first().click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "收起信纸，保留草稿" }).click();
    await page.locator(".indoor-back").click();
    await page.waitForFunction(() => !document.querySelector(".world-stage")?.inert);
    await page.locator(".focus-bookmark").click();
    await page.getByRole("button", { name: "开始专注", exact: true }).click();
    await page.getByRole("button", { name: "收起控制", exact: true }).click();
    await page.getByRole("button", { name: "发现下一家小店" }).click();
    await page.waitForURL("**/shop/sashimi");
    await page.getByRole("button", { name: "返回上一家小店" }).click();
    await page.waitForURL("**/shop/grandpa");
    assert.ok((await page.locator(".focus-bookmark").getAttribute("aria-label")).startsWith("专注中"));
    await page.locator(".world-stage").focus(); await page.keyboard.press("ArrowRight");
    await page.waitForURL("**/shop/sashimi");
    await page.locator(".world-stage").focus(); await page.keyboard.press("ArrowLeft");
    await page.waitForURL("**/shop/grandpa");
    const drag = async (selector, from, to, pointerType = "mouse") => {
      await page.locator(selector).evaluate((node, { from, to, pointerType }) => {
        const event = (type, x) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, pointerType, button: 0, clientX: x, clientY: 120 }));
        event("pointerdown", from); event("pointerup", to);
      }, { from, to, pointerType });
    };
    await drag("#scene-mailbox", 240, 100);
    assert.equal(new URL(page.url()).pathname, "/shop/grandpa");
    await drag(".world-stage", 10, 150, "touch");
    assert.equal(new URL(page.url()).pathname, "/shop/grandpa");
    await drag(".world-stage", 240, 100, "touch"); await page.waitForURL("**/shop/sashimi");
    await drag(".world-stage", 100, 240); await page.waitForURL("**/shop/grandpa");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal page overflow");
    passed.push(`single shop, account, dialog, compose, exterior discovery and return at ${width}px`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, browserErrors: errors }, null, 2));
} finally { await browser.close(); }
