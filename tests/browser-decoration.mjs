// UI checks use a controlled server contract; database ownership/concurrency are tested against PostgreSQL.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const origin = process.env.INDOOR_TEST_URL || "http://127.0.0.1:3110";
const base = (await (await fetch(`${origin}/api/shops/grandpa`)).json()).shop;
const themes = Object.fromEntries(await Promise.all(["sashimi", "dessert", "matcha"].map(async id => [id, (await (await fetch(`${origin}/api/shops/${id}`)).json()).shop])));
const errors = [], passed = [];
let activePage;
async function fixture(width, persisted = {}) {
  const state = Object.assign({ shop: { ...structuredClone(base), id: "my-store", kind: "human", name: "小林的小店", isOwner: true }, revision: 0, onboardedAt: null, failure: null, saves: 0, signedIn: true }, persisted);
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    const Audio = window.AudioContext;
    window.audioInstances = 0;
    if (Audio) window.AudioContext = class extends Audio { constructor(...args) { super(...args); window.audioInstances++; } };
  });
  await context.route("**/api/**", async route => {
    const url = new URL(route.request().url()), method = route.request().method();
    const json = (value, status = 200) => route.fulfill({ status, json: value });
    if (url.pathname === "/api/me") return json({ user: state.signedIn ? { id: "owner", displayName: "小林" } : null, configured: true, myShopId: state.signedIn ? state.shop.id : null });
    if (url.pathname === "/api/shops" || url.pathname === "/api/shops/favorites") return json({ shops: [], nextCursor: null });
    if (url.pathname === "/api/threads") return json({ threads: [] });
    if (url.pathname === "/api/weather") return json({ error: "offline" }, 502);
    if (url.pathname === `/api/shops/${state.shop.id}`) return json({ shop: { ...state.shop, isOwner: state.signedIn } });
    if (url.pathname === "/api/shops/mine/decoration") {
      if (!state.signedIn) return json({ error: "请先登录" }, 401);
      const input = method === "PATCH" ? route.request().postDataJSON() : undefined;
      if ((input?.shopId ?? url.searchParams.get("shopId")) !== state.shop.id) return json({ error: "只能装饰自己的小店。" }, 403);
      if (input) {
        if (state.failure) return json({ error: state.failure === 409 ? "小店已更新，请重新读取。" : "保存失败，请重试。" }, state.failure);
        if (input.action === "save") {
          if (input.revision !== state.revision) return json({ error: "请重新读取" }, 409);
          const { themeId, showForegroundPlants, ...details } = input.settings;
          state.shop = { ...state.shop, ...details, appearance: { showForegroundPlants }, scenes: { ...state.shop.scenes, indoor: themes[themeId]?.scenes.indoor ?? state.shop.scenes.indoor } };
          state.saves++;
        }
        state.onboardedAt ||= "2026-10-16T00:00:00.000Z"; state.revision++;
      }
      return json({ shop: state.shop, revision: state.revision, onboardedAt: state.onboardedAt });
    }
    return route.continue();
  });
  const page = await context.newPage(); activePage = page; page.on("pageerror", error => errors.push(error.message));
  return { context, page, state };
}
async function inside(page) { await page.waitForFunction(() => { const node = document.querySelector("#indoor-scene"); return node && !node.inert && !node.closest("[hidden]"); }); }
async function editor(page) { await page.getByRole("heading", { name: "装饰我的小店" }).waitFor(); await page.getByLabel("店名", { exact: true }).waitFor(); }
try {
  for (const width of [375, 768, 1024, 1440]) {
    const { page, context, state } = await fixture(width);
    await page.goto(`${origin}/shop/my-store`);
    await page.waitForFunction(() => !document.querySelector(".world-stage")?.inert);
    await page.getByRole("button", { name: "解忧杂货店", exact: true }).click();
    await page.waitForURL("**/shop/grandpa");
    await page.locator("#scene-mailbox").click();
    await page.locator(".letter-sheet textarea").fill(`装饰前给爷爷的草稿 ${width}`);
    await page.getByRole("button", { name: "收起信纸，保留草稿", exact: true }).click();
    await page.getByRole("button", { name: /回自己的店/ }).click();
    await page.waitForURL("**/shop/my-store");
    await page.locator(".personal-shop-sign").filter({ hasText: "小林的小店" }).waitFor();
    // Start a real shared timer/audio session before entering the independent page.
    await page.locator(".focus-bookmark").click();
    await page.getByRole("button", { name: "开始专注", exact: true }).click();
    await page.getByRole("button", { name: "收起控制", exact: true }).click();
    await page.locator(".music-dock-summary").click();
    await page.getByRole("dialog", { name: "街角的声音" }).getByRole("button", { name: "播放音乐", exact: true }).click();
    await page.getByRole("dialog", { name: "街角的声音" }).getByRole("button", { name: "暂停音乐", exact: true }).waitFor();
    await page.getByRole("button", { name: "收起控制", exact: true }).click();
    const audioCount = await page.evaluate(() => window.audioInstances);
    assert.ok(audioCount > 0, "A real audio engine has started");
    await page.locator(".shop-entry-door").click();
    await page.waitForURL("**/shop/my-store/decorate"); await editor(page);
    assert.equal(state.onboardedAt, null);
    await page.getByRole("button", { name: "暂时跳过", exact: true }).click(); await inside(page);
    assert.equal(state.shop.scenes.indoor.templateId, "grandpa");
    assert.ok(state.onboardedAt); assert.equal(state.saves, 0);
    assert.ok((await page.locator(".focus-bookmark").getAttribute("aria-label")).startsWith("专注中"));
    await page.getByRole("button", { name: "装饰小店", exact: true }).click(); await editor(page);
    assert.equal(await page.getByRole("button", { name: "暂时跳过", exact: true }).count(), 0);
    for (const [id, name] of [["sashimi", "喵猫刺身"], ["dessert", "兔子的甜品屋"], ["matcha", "一盏抹茶"]]) {
      await page.getByRole("button", { name: `选择${name}主题`, exact: true }).click();
      const source = await page.locator(".decoration-layered-preview img").nth(1).getAttribute("src");
      assert.ok(source.includes(`/optimized/${id}/keeper.webp`));
    }
    await page.getByLabel("店名", { exact: true }).fill("小林的新牌匾");
    await page.getByLabel("小店介绍", { exact: true }).fill("一起慢慢喝杯茶。");
    await page.getByRole("button", { name: "苔绿色", exact: true }).click();
    await page.getByLabel("默认音乐", { exact: true }).selectOption("store-lamp");
    await page.getByLabel("显示门前草丛", { exact: true }).uncheck();
    await page.getByRole("button", { name: "门前", exact: true }).click();
    assert.equal(await page.locator(".decoration-preview-plants").count(), 0);
    assert.equal(state.shop.name, "小林的小店", "Preview must not publish changes");
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button", { name: "返回小店", exact: true }).click();
    assert.ok(page.url().endsWith("/decorate"));
    // Browser Back must also preserve unsaved selections when leaving is canceled.
    page.once("dialog", dialog => dialog.dismiss()); await page.goBack();
    await page.waitForURL("**/decorate");
    assert.equal(await page.getByLabel("店名", { exact: true }).inputValue(), "小林的新牌匾");
    state.failure = 503;
    await page.getByRole("button", { name: "保存装饰", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "保存失败" }).waitFor();
    assert.equal(await page.getByLabel("店名", { exact: true }).inputValue(), "小林的新牌匾");
    state.failure = 409;
    await page.getByRole("button", { name: "保存装饰", exact: true }).click();
    await page.getByRole("button", { name: "重新读取最新布置", exact: true }).waitFor();
    state.failure = null;
    await page.getByRole("button", { name: "保存装饰", exact: true }).click(); await inside(page);
    assert.equal(state.saves, 1); assert.equal(state.shop.scenes.indoor.templateId, "matcha");
    assert.equal(state.shop.scenes.outdoor.templateId, "grandpa");
    await page.getByRole("button", { name: "和抹茶店长聊聊", exact: true }).waitFor();
    assert.ok((await page.locator(".focus-bookmark").getAttribute("aria-label")).startsWith("专注中"));
    assert.equal(await page.evaluate(() => window.audioInstances), audioCount);
    await page.locator(".indoor-back").click();
    await page.waitForFunction(() => !document.querySelector(".world-stage")?.inert);
    assert.equal(await page.locator(".foreground-plant").count(), 0);
    assert.equal(await page.locator(".personal-shop-sign").textContent(), "小林的新牌匾");
    await page.getByRole("button", { name: "解忧杂货店", exact: true }).click();
    await page.waitForURL("**/shop/grandpa"); await page.locator("#scene-mailbox").click();
    assert.equal(await page.locator(".letter-sheet textarea").inputValue(), `装饰前给爷爷的草稿 ${width}`);
    await page.getByRole("button", { name: "收起信纸，保留草稿", exact: true }).click();
    await page.getByRole("button", { name: /回自己的店/ }).click();
    await page.waitForURL("**/shop/my-store");
    await page.reload(); await page.locator(".shop-entry-door").click(); await inside(page);
    assert.ok(!page.url().endsWith("/decorate"));
    await page.getByRole("button", { name: "装饰小店", exact: true }).click(); await editor(page);
    assert.equal(await page.getByLabel("店名", { exact: true }).inputValue(), "小林的新牌匾");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (process.env.DECORATION_SCREENSHOT_DIR) {
      await page.locator(".decoration-themes img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await mkdir(process.env.DECORATION_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.DECORATION_SCREENSHOT_DIR, `decoration-${width}.png`) });
    }
    await page.getByLabel("店名", { exact: true }).fill("很长的店名".repeat(6));
    for (const [id, name, keeper, menu] of [["sashimi", "喵猫刺身", "刺身师傅", "今日刺身"], ["dessert", "兔子的甜品屋", "甜品店长", "草莓小蛋糕"], ["matcha", "一盏抹茶", "抹茶店长", "手作抹茶"]]) {
      await page.getByRole("button", { name: `选择${name}主题`, exact: true }).click();
      await page.getByRole("button", { name: "保存装饰", exact: true }).click(); await inside(page);
      await page.locator(`.indoor-keeper-${id}`).waitFor();
      assert.equal(await page.locator(".indoor-order-note").count(), 0, "A theme save clears earlier temporary orders");
      await page.getByRole("button", { name: `和${keeper}聊聊`, exact: true }).click();
      await page.getByRole("dialog", { name: keeper, exact: true }).waitFor();
      await page.getByRole("button", { name: "关闭对话", exact: true }).click();
      await page.getByRole("button", { name: "看看菜单", exact: true }).click();
      await page.getByRole("dialog", { name: keeper, exact: true }).getByRole("button", { name: new RegExp(menu) }).click();
      await page.locator(".indoor-order-note").waitFor();
      if (id !== "matcha") { await page.getByRole("button", { name: "装饰小店", exact: true }).click(); await editor(page); }
    }
    const back = await page.locator(".indoor-back").boundingBox(), decorate = await page.locator(".indoor-decorate").boundingBox();
    assert.ok(back.x + back.width <= decorate.x || back.y + back.height <= decorate.y, "Header actions do not overlap");
    if (await page.locator(".indoor-wordmark").isVisible()) {
      const title = await page.locator(".indoor-wordmark").boundingBox();
      assert.ok(title.x >= back.x + back.width && title.x + title.width <= decorate.x, "Long name stays between header controls");
    }
    // A new browser context sees the same server-side completion marker.
    const second = await fixture(width, { shop: state.shop, revision: state.revision, onboardedAt: state.onboardedAt });
    await second.page.goto(`${origin}/shop/my-store`); await second.page.locator(".shop-entry-door").click(); await inside(second.page);
    assert.equal(await second.page.getByRole("button", { name: "装饰小店", exact: true }).count(), 1);
    await second.context.close();
    passed.push(`onboarding, skip, three themes, preview, unsaved Back, failure/conflict/retry, save, timer/audio/letter draft, refresh and another device at ${width}px`);
    await context.close();
  }
  const denied = await fixture(375);
  await denied.page.goto(`${origin}/shop/grandpa/decorate`);
  await denied.page.getByRole("alert").filter({ hasText: "只能装饰自己的小店" }).waitFor();
  assert.equal(await denied.page.locator("#decoration-form").count(), 0);
  await denied.context.close();
  const visitor = await fixture(375, { signedIn: false });
  await visitor.page.goto(`${origin}/shop/my-store/decorate`);
  await visitor.page.getByText("登录后才能装饰自己的小店。", { exact: true }).waitFor();
  assert.equal(await visitor.page.locator("#decoration-form").count(), 0);
  await visitor.context.close();
  passed.push("official/other destination denied and anonymous editor requires login");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, browserErrors: errors }, null, 2));
} catch (error) {
  console.error(await activePage?.locator("body").innerText().catch(() => "page closed"));
  throw error;
} finally { await browser.close(); }
