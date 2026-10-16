import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

// Real HTTP routing / SSR checks; no browser, real credentials or external services.
const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const { port } = listener.address();
await new Promise(resolve => listener.close(resolve));
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env };
for (const key of ["SUPABASE_URL", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "DIRECT_DATABASE_URL", "OPENAI_API_KEY"]) env[key] = "";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });
let checks = 0;
try {
  let ready = false;
  const until = Date.now() + 25_000;
  while (Date.now() < until) {
    try { ready = (await fetch(`${base}/api/me`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Wait for local server only. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  assert.ok(ready, `Local server failed to start: ${logs}`);
  const session = await fetch(`${base}/api/me`);
  assert.deepEqual(await session.json(), { user: null, configured: false, myShopId: null }); checks++;
  for (const [path, name] of [["/", "解忧杂货店"], ["/shop/grandpa", "解忧杂货店"], ["/shop/sashimi", "喵猫刺身"], ["/shop/dessert", "兔子的甜品屋"], ["/shop/matcha", "一盏抹茶"]]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(name), `${path} renders its own shop`);
    assert.ok(html.includes("小店头像导航"), `${path} contains avatar navigation`);
    assert.ok(!html.includes("本机旧信"), `${path} removes the local archive`); checks++;
  }
  const redirect = await fetch(`${base}/shops/grandpa?from=shared`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/shop/grandpa?from=shared"); checks++;
  for (const id of ["grandpa", "sashimi", "dessert", "matcha"]) {
    const response = await fetch(`${base}/api/shops/${id}`);
    assert.equal(response.status, 200);
    const { shop } = await response.json();
    assert.equal(shop.id, id);
    assert.equal(shop.scenes.outdoor.templateId, id);
    assert.equal(shop.scenes.indoor.templateId, id);
    assert.ok(!("ownerId" in shop)); checks++;
  }
  const obsolete = await fetch(`${base}/api/letters/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "旧接口不应继续匿名调用AI" }) });
  assert.equal(obsolete.status, 410); checks++;
  for (const path of ["/api/shops/mine", "/api/threads"]) {
    const response = await fetch(`${base}${path}`);
    assert.ok(response.status === 401 || response.status === 503);
    assert.ok(typeof (await response.json()).error === "string"); checks++;
  }
  const csrf = await fetch(`${base}/api/threads`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://unrelated.example" }, body: "{}" });
  assert.equal(csrf.status, 403); checks++;
  console.log(`${checks} HTTP/SSR checks passed (no browser; no live service credentials).`);
} finally {
  server.kill();
  await once(server, "exit").catch(() => {});
}
