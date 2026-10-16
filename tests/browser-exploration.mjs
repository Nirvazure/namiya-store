// UI contract tests use controlled HTTP fixtures; real DB concurrency is tested separately.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const origin = process.env.INDOOR_TEST_URL || "http://127.0.0.1:3100";
const errors = [], passed = [];
let activePage;
const base = (await (await fetch(`${origin}/api/shops/grandpa`)).json()).shop;
const owner = { ...base, id: "my-store", kind: "human", name: "小林的小店", ownerDisplayName: "小林", ownerAvatarUrl: null, discoverable: true };
const friend = { ...base, id: "friend-store", kind: "human", name: "海边小店", ownerDisplayName: "小海", ownerAvatarUrl: null, discoverable: true };
const user = { id: "account-a", displayName: "小林和一串很长很长的昵称用于验证单行省略", avatarUrl: "/missing-avatar.png" };
const thread = { id: "human-thread", shopId: friend.id, shopName: friend.name, title: "来信", signature: null, viewerRole: "visitor", isAi: false, unread: true, blocked: false, generationStatus: "idle", updatedAt: new Date().toISOString() };
try {
  for (const width of [375, 1440]) {
    let favorite = false, signedIn = true, delivered = false, unreadRequests = 0;
    const my = { ...owner }, other = { ...friend };
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", hasTouch: width === 375, isMobile: width === 375 });
    await context.route("**/api/**", async route => {
      const url = new URL(route.request().url()), method = route.request().method();
      const json = value => route.fulfill({ json: value });
      if (url.pathname === "/api/me") return json({ user: signedIn ? user : null, configured: true, myShopId: signedIn ? my.id : null });
      if (url.pathname === "/api/auth/signout") { signedIn = false; return json({ ok: true }); }
      if (url.pathname === "/api/shops") return json({ shops: other.isOpen && other.discoverable ? [other] : [], nextCursor: null });
      if (url.pathname === "/api/shops/favorites") return json({ shops: favorite ? [{ ...other, isFavorite: true }] : [], nextCursor: null });
      if (url.pathname === "/api/shops/mine/settings") { Object.assign(my, route.request().postDataJSON()); return json({ shop: { ...my, isOwner: true } }); }
      if (url.pathname.endsWith("/favorite")) { favorite = method === "PUT"; return json({ isFavorite: favorite }); }
      if (url.pathname === `/api/shops/${my.id}`) return json({ shop: { ...my, isOwner: signedIn } });
      if (url.pathname === `/api/shops/${other.id}`) return json({ shop: { ...other, isOwner: false, isFavorite: favorite } });
      if (url.pathname === "/api/threads" && method === "POST") { delivered = true; return json({ thread: { ...thread, unread: false }, messages: [] }); }
      if (url.pathname === "/api/threads") {
        if (url.searchParams.get("box") === "all") { unreadRequests++; await new Promise(done => setTimeout(done, 100)); }
        return json({ threads: delivered ? [thread] : [] });
      }
      return route.continue();
    });
    const page = await context.newPage(); activePage = page; page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin); await page.waitForURL(`**/shop/${my.id}`);
    await page.getByRole("button", { name: /账号与营业设置/ }).click();
    await page.getByRole("switch", { name: "参与随机发现" }).click();
    await page.waitForFunction(() => !document.querySelector('[aria-label="参与随机发现"]').checked);
    await page.getByRole("switch", { name: "小店营业", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[aria-label="小店营业"]').checked);
    await page.getByRole("button", { name: "关闭账号菜单" }).click();
    assert.equal(await page.locator(".closed-shop-status").count(), 1);
    await page.locator("#scene-mailbox").click();
    await page.getByRole("dialog", { name: "自己的信箱" }).waitFor();
    await page.getByRole("button", { name: "关闭窗口" }).click();
    await page.getByRole("button", { name: /账号与营业设置/ }).click();
    await page.getByRole("switch", { name: "小店营业", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="小店营业"]').checked);
    assert.equal(await page.getByRole("switch", { name: "参与随机发现" }).isChecked(), false);
    await page.getByRole("button", { name: "关闭账号菜单" }).click();
    await page.getByRole("button", { name: "发现下一家小店" }).click();
    await page.waitForURL(`**/shop/${other.id}`);
    await page.goBack(); await page.waitForURL(`**/shop/${my.id}`);
    await page.locator(".world-shop-card strong").filter({ hasText: my.name }).waitFor();
    await page.goForward(); await page.waitForURL(`**/shop/${other.id}`);
    await page.locator(".world-shop-card strong").filter({ hasText: other.name }).waitFor();
    await page.getByRole("button", { name: "收藏这家店", exact: true }).click();
    await page.getByRole("button", { name: "取消收藏这家店", exact: true }).waitFor();
    await page.locator("#scene-mailbox").click();
    await page.locator(".letter-sheet textarea").fill("希望海边的风能带来好消息。");
    await page.locator(".namiya-writing-desk__fold-button").click();
    await page.locator(".held-envelope").waitFor();
    await page.locator("#scene-mailbox").click();
    await page.getByText("信已送达。回到自己的店，等一封回信吧。", { exact: false }).waitFor();
    assert.equal(new URL(page.url()).pathname, `/shop/${other.id}`);
    assert.equal(await page.getByRole("dialog").count(), 0);
    other.isOpen = false;
    await page.getByRole("button", { name: /回自己的店/ }).click();
    await page.waitForURL(`**/shop/${my.id}`);
    await page.locator("#scene-mailbox").click();
    await page.getByRole("dialog", { name: "自己的信箱" }).waitFor();
    await page.locator(".mail-thread").waitFor();
    assert.equal(await page.locator(".mail-thread").count(), 1);
    await page.getByRole("button", { name: "关闭窗口" }).click();
    await page.getByRole("button", { name: "海边小店", exact: true }).click();
    await page.waitForURL(`**/shop/${other.id}`);
    await page.locator(".closed-shop-status").waitFor();
    assert.equal(await page.locator(".shop-entry-door").isDisabled(), true);
    await page.getByRole("button", { name: /海边小店，暂时关店/ }).waitFor();
    await page.reload();
    await page.locator(".closed-shop-status").waitFor();
    await page.getByRole("button", { name: /海边小店，暂时关店/ }).waitFor();
    const label = await page.locator(".user-center-entry > span:last-child").boundingBox();
    assert.ok(label.height < 30, "Nickname stays on one line");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (process.env.EXPLORATION_SCREENSHOT_DIR) {
      await mkdir(process.env.EXPLORATION_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.EXPLORATION_SCREENSHOT_DIR, `exploration-${width}.png`) });
    }
    const beforeRefresh = unreadRequests;
    const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/threads");
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await refreshed;
    assert.equal(unreadRequests - beforeRefresh, 1, "Simultaneous resume events share one unread request");
    await page.getByRole("button", { name: /账号与营业设置/ }).click();
    await page.getByRole("button", { name: "退出本站登录", exact: true }).click();
    await page.getByRole("button", { name: "登录", exact: true }).waitFor();
    assert.equal(await page.locator(".anchor-favorites").count(), 0, "Signout clears private favorites");
    passed.push(`account, settings, closed owner mailbox, discovery, favorite, delivery, own inbox, closed favorite and reload at ${width}px`);
    await context.close();
  }
  assert.deepEqual(errors, []); console.log(JSON.stringify({ passed, browserErrors: errors }, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error(await activePage.locator("body").innerText());
    if (process.env.EXPLORATION_SCREENSHOT_DIR) await activePage.screenshot({ path: join(process.env.EXPLORATION_SCREENSHOT_DIR, "exploration-failure.png") });
  }
  throw error;
} finally { await browser.close(); }
