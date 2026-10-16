// Local disposable PostgreSQL only. Run with --conditions=react-server --import ./tests/register.mjs.
import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { once } from "node:events";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const modulePath = process.env.EMBEDDED_POSTGRES_MODULE;
assert.ok(modulePath, "Set EMBEDDED_POSTGRES_MODULE to a locally installed embedded-postgres package.");
const { default: EmbeddedPostgres } = await import(pathToFileURL(require.resolve(modulePath)).href);
const listener = createServer(); listener.listen(0, "127.0.0.1"); await once(listener, "listening");
const port = listener.address().port; await new Promise(done => listener.close(done));
const directory = await mkdtemp(join(resolve("node_modules/.cache"), "namiya-db-"));
const postgres = new EmbeddedPostgres({ databaseDir: directory, user: "postgres", password: randomUUID(), port, persistent: true, initdbFlags: ["--locale=C", "--encoding=UTF8"], onLog() {}, onError() {} });
let client;
let prisma;
const passed = [];
try {
  await postgres.initialise(); await postgres.start();
  console.log("Local PostgreSQL started");
  client = postgres.getPgClient("postgres", "127.0.0.1"); client.connectionParameters.connectionTimeoutMillis = 5000; await client.connect();
  console.log("Local PostgreSQL connected");
  await client.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  await client.query(await readFile("prisma/migrations/20261015000000_initial/migration.sql", "utf8"));
  const owner = randomUUID(), visitor = randomUUID(), other = randomUUID();
  for (const id of [owner, visitor, other]) await client.query("INSERT INTO auth.users VALUES($1)", [id]);
  const { defaultShop } = await import("../domain/shops.ts");
  await client.query(`INSERT INTO namiya_store.shops(id,"ownerId",published,"publishedAt",draft,"updatedAt") VALUES('legacy',$1,$2,NOW(),$3,NOW())`, [owner, { ...defaultShop, acceptingLetters: false }, { name: "未发布的私有草稿" }]);
  await client.query(`INSERT INTO namiya_store.shops(id,"ownerId",draft,"updatedAt") VALUES('draft-only',$1,$2,NOW())`, [other, { ...defaultShop, name: "私有布置草稿", acceptingLetters: false }]);
  await client.query(await readFile("prisma/migrations/20261016000000_shop_exploration/migration.sql", "utf8"));
  await client.query(await readFile("prisma/migrations/20261016010000_shop_decoration/migration.sql", "utf8"));
  const backfill = (await client.query(`SELECT * FROM namiya_store.shops WHERE id='legacy'`)).rows[0];
  assert.equal(backfill.acceptingLetters, false); assert.equal(backfill.discoverable, true); assert.equal(backfill.draft.name, "未发布的私有草稿");
  assert.equal(backfill.decorationOnboardedAt, null);
  passed.push("initial plus additive migration, published receiving backfill and draft retention");
  // The actual generated local password is held only in this process.
  const localConfig = client.connectionParameters;
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(localConfig.user)}:${encodeURIComponent(localConfig.password)}@127.0.0.1:${port}/postgres?schema=namiya_store`;
  ({ prisma } = await import("../lib/server/db.ts"));
  const { initializeAccount } = await import("../lib/server/account.ts");
  const { updateShopSettings, favoriteShop, listFavorites, discoverShops } = await import("../lib/server/shop-exploration.ts");
  const { createThread, appendMessage } = await import("../lib/server/messaging.ts");
  const identity = { id: visitor, user_metadata: { full_name: "本地访客" } };
  const results = await Promise.all(Array.from({ length: 3 }, () => initializeAccount(identity)));
  assert.equal(new Set(results.map(shop => shop.id)).size, 1);
  assert.equal(await prisma.shop.count({ where: { ownerId: visitor } }), 1);
  await initializeAccount({ id: owner });
  assert.equal((await prisma.shop.findUnique({ where: { id: "legacy" } })).draft.name, "未发布的私有草稿");
  const restored = await initializeAccount({ id: other });
  assert.equal(restored.id, "draft-only"); assert.equal(restored.draft.name, "私有布置草稿");
  assert.equal(restored.published.name, "旅人的小店"); assert.equal(restored.acceptingLetters, false);
  passed.push("real concurrent account initialization uses one unique shop and preserves old data");
  await updateShopSettings(owner, { isOpen: true, acceptingLetters: true });
  const thread = await createThread(visitor, { shopId: "legacy", body: "本地测试来信", clientRequestId: "local-first" });
  const blocker = postgres.getPgClient("postgres", "127.0.0.1"); await blocker.connect();
  await blocker.query("BEGIN"); await blocker.query(`SELECT id FROM namiya_store.shops WHERE id='legacy' FOR UPDATE`);
  await blocker.query(`UPDATE namiya_store.shops SET "isOpen"=false WHERE id='legacy'`);
  const pending = createThread(other, { shopId: "legacy", body: "关店竞争来信", clientRequestId: "close-race" });
  const rejected = assert.rejects(pending, error => error.status === 409);
  await new Promise(done => setTimeout(done, 100)); await blocker.query("COMMIT"); await blocker.end(); await rejected;
  assert.equal(await prisma.thread.count({ where: { clientRequestId: "close-race" } }), 0);
  await appendMessage(thread.thread.id, owner, { body: "关店后仍能回信", clientRequestId: "local-reply" });
  passed.push("actual PostgreSQL row lock serializes closing against new delivery; existing correspondence continues");
  await Promise.all([favoriteShop(visitor, "legacy", true), favoriteShop(visitor, "legacy", true)]);
  assert.equal(await prisma.shopFavorite.count({ where: { userId: visitor } }), 1);
  assert.equal((await listFavorites(visitor, null)).shops[0].isOpen, false);
  assert.ok(!(await discoverShops()).shops.some(shop => shop.id === "legacy"));
  await updateShopSettings(owner, { isOpen: true, discoverable: false });
  assert.ok(!(await discoverShops()).shops.some(shop => shop.id === "legacy"));
  const grants = await client.query(`SELECT relrowsecurity,has_table_privilege('anon','namiya_store.shop_favorites','SELECT') AS anon_read,has_table_privilege('authenticated','namiya_store.shop_favorites','SELECT') AS auth_read FROM pg_class WHERE oid='namiya_store.shop_favorites'::regclass`);
  assert.deepEqual(grants.rows[0], { relrowsecurity: true, anon_read: false, auth_read: false });
  passed.push("persistent unique favorites keep closed shops; discovery filters closure and visibility; RLS and browser privileges verified");
  for (let i = 0; i < 15; i++) {
    const id = randomUUID(); await client.query("INSERT INTO auth.users VALUES($1)", [id]);
    await client.query(`INSERT INTO namiya_store.shops(id,"ownerId",published,"publishedAt","updatedAt") VALUES($1,$2,$3,NOW(),NOW())`, [`candidate-${i}`, id, defaultShop]);
  }
  const first = await discoverShops(visitor), second = await discoverShops(visitor, first.nextCursor);
  assert.equal(first.shops.length, 12); assert.ok(first.nextCursor); assert.equal(second.shops.length, 4);
  assert.equal(new Set([...first.shops, ...second.shops].map(shop => shop.id)).size, 16);
  assert.deepEqual(await discoverShops(visitor, first.nextCursor), second);
  const { publishShop } = await import("../lib/server/shops.ts");
  await publishShop(other);
  assert.equal((await prisma.shop.findUnique({ where: { id: "draft-only" } })).acceptingLetters, false);
  await favoriteShop(visitor, "candidate-0", true);
  await prisma.shop.delete({ where: { id: "candidate-0" } });
  assert.equal(await prisma.shopFavorite.count({ where: { shopId: "candidate-0" } }), 0);
  passed.push("seeded real SQL pagination is stable and nonoverlapping; publishing retains settings; shop deletion cascades favorites");
  const { readDecoration, updateDecoration } = await import("../lib/server/shop-decoration.ts");
  const { saveDraft, publishedShop } = await import("../lib/server/shops.ts");
  const beforeDecoration = await readDecoration(owner, "legacy");
  assert.equal(beforeDecoration.onboardedAt, null);
  const skipped = await updateDecoration(owner, { action: "skip", shopId: "legacy" });
  assert.ok(skipped.onboardedAt); assert.deepEqual(skipped.shop.scenes, beforeDecoration.shop.scenes);
  const skippedAgain = await updateDecoration(owner, { action: "skip", shopId: "legacy" });
  assert.equal(skippedAgain.revision, skipped.revision);
  assert.equal(skippedAgain.onboardedAt, skipped.onboardedAt);
  await assert.rejects(readDecoration(visitor, "legacy"), error => error.status === 403);
  await assert.rejects(updateDecoration(visitor, { action: "skip", shopId: "legacy" }), error => error.status === 403);
  assert.ok(!JSON.stringify(publishedShop(await prisma.shop.findUnique({ where: { id: "legacy" } }))).includes("onboarded"));
  passed.push("decoration migration preserves old shops; persistent skip is idempotent; owner checks and private metadata verified");
  const draft = { ...defaultShop, name: "之前未发布的名字", scenes: { ...defaultShop.scenes } };
  await saveDraft(owner, draft);
  const currentDecoration = await readDecoration(owner, "legacy");
  const settings = { name: "本地装饰测试", description: "装饰后的介绍", signStyle: "paper", musicTrackId: "store-lamp", showForegroundPlants: false, themeId: "dessert" };
  const race = await Promise.allSettled([
    updateDecoration(owner, { action: "save", shopId: "legacy", revision: currentDecoration.revision, settings }),
    updateDecoration(owner, { action: "save", shopId: "legacy", revision: currentDecoration.revision, settings: { ...settings, themeId: "matcha" } }),
  ]);
  assert.equal(race.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(race.filter(item => item.status === "rejected" && item.reason.status === 409).length, 1);
  const winner = race.find(item => item.status === "fulfilled").value;
  const afterPublish = await publishShop(owner);
  assert.equal(afterPublish.scenes.indoor.templateId, winner.shop.scenes.indoor.templateId);
  assert.equal(afterPublish.name, settings.name); assert.equal(afterPublish.appearance.showForegroundPlants, false);
  assert.deepEqual(afterPublish.scenes.outdoor, currentDecoration.shop.scenes.outdoor);
  assert.equal(afterPublish.discoverable, false); assert.equal(afterPublish.acceptingLetters, true);
  const completed = await readDecoration(owner, "legacy");
  assert.equal(completed.onboardedAt, skipped.onboardedAt);
  passed.push("real concurrent decoration saves have one winner; draft publishing retains decoration; exterior, operating settings and onboarding are preserved");
  console.log(JSON.stringify({ passed }, null, 2));
} finally {
  await prisma?.$disconnect(); await client?.end();
  const stopping = postgres.stop();
  // Windows taskkill may not be available in the test sandbox. Terminate only this disposable cluster.
  if (process.platform === "win32") {
    const pid = Number((await readFile(join(directory, "postmaster.pid"), "utf8").catch(() => "")).split(/\r?\n/)[0]);
    if (Number.isSafeInteger(pid) && pid > 0) {
      try { process.kill(pid); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
  }
  await stopping;
}
