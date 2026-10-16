# 小店装饰与首次引导验收（2026-10-16）

## 交付内容

个人店新增 `/shop/[shopId]/decorate`。新老账号首次推门进入自己的店时打开装饰引导，保存或暂时跳过后进入室内；之后可用室内“装饰小店”再次进入。游客、官方店及他人店铺不能修改。

- 三套主题：喵猫刺身、兔子甜品屋、一盏抹茶（抹茶小店），同步角色、图层、热点、菜单、预加载与临时互动状态。
- 店名、介绍、旧木牌/手写纸牌/苔绿色文字牌匾、雨夜电台/店灯未眠默认音景、前景草丛开关。
- 不主动选主题时保留爷爷或历史自定义室内；门面及上传资源路径保留。店主角色不改变账号头像、通信归属和 AI 回信身份。
- 预览不发布、不自动播放音乐；保存原子更新公开布置及已有草稿的对应字段。保留营业、发现、接信及其他草稿内容。
- 保存冲突提示重新读取；失败保留选择；页面返回、浏览器后退和关闭有未保存内容时提示确认。
- 引导处理时间存于账号所属店铺，仅本人装饰接口返回；重复跳过不增加版本，不重置布置。

本人接口：`GET /api/shops/mine/decoration?shopId=...`；`PATCH /api/shops/mine/decoration` 接收 `save` 或 `skip`。保存包含 `shopId`、`revision`、`settings`，只接受三套主题、三种牌匾和两种音乐的白名单选项，不接受任意素材地址。身份、归属、同源和版本校验均在服务端执行。

## 本地验证

- 单元：19 文件、93 项；旧版：44 项。包括跨账号拒绝、白名单、跳过幂等、保留历史室内、草稿同步、营业设置隔离及版本冲突。
- 真实本地 PostgreSQL：依次执行初始、漫游和本次装饰迁移，验证已有店铺时间字段为空、重复跳过不更新、两个同时保存只有一个成功；随后发布旧草稿仍保留装饰、门面和营业状态。
- 浏览器装饰流程：375、768、1024、1440px，覆盖首次进入、跳过、三主题预览、保存失败/冲突/重试、取消页面返回与浏览器后退、刷新及新浏览器上下文恢复。音乐先实际播放，验证往返未新建音频引擎；运行中的番茄钟及按账号/目标店隔离的信件草稿保留。使用减少动态效果模式，检查长店名和按钮布局。
- 室内 4 组、漫游 2 组、天气 30 组及装饰 5 组浏览器检查全部通过，浏览器异常为零；ESLint、TypeScript、直接 `next build` 和 17 项 HTTP/SSR 检查通过。浏览器账号和数据接口使用明确的 HTTP 测试夹具；数据库并发、事务和归属另在真实 PostgreSQL 验证，不能视为真实 OAuth 或远端数据库联调。
- Standards 与 Spec 两条审查均无剩余问题；已修复浏览器后退绕过未保存确认、室内长店名挤压装饰入口的问题。

复验命令（Windows；浏览器工具通过 `PLAYWRIGHT_MODULE` 和 `BROWSER_EXECUTABLE` 指定本机安装）：

```powershell
node node_modules/vitest/vitest.mjs run
node --import ./tests/register.mjs --test tests/*.test.mjs
node node_modules/eslint/bin/eslint.js
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
node tests/http-smoke.mjs
node tests/browser-decoration.mjs
node tests/browser-exploration.mjs
node tests/browser-indoor.mjs
node tests/browser-weather.mjs
```

`INDOOR_TEST_URL` 指向被测服务。数据库测试使用单独安装在忽略目录的 `embedded-postgres`，将 `EMBEDDED_POSTGRES_MODULE` 设为其 `dist/index.js` 绝对路径，然后执行 `node --conditions=react-server --import ./tests/register.mjs tests/database-exploration.mjs`。脚本强制使用本地新建临时数据库，不读取远端连接。

本机既有开发服务占用 Prisma 引擎 DLL，常规 `prisma generate` 的 DLL 替换报 EPERM；客户端模型和类型已更新，真实数据库测试与直接 `next build` 通过。完整 `npm run build` 还需在释放该 DLL 后复验，未停止用户已有开发服务。

## 远端迁移执行记录

精确文件：[20261016010000_shop_decoration/migration.sql](../prisma/migrations/20261016010000_shop_decoration/migration.sql)。先通过本地 PostgreSQL 验证，随后于 2026-10-16 经用户审阅 SQL 并明确授权，使用项目现有 `prisma migrate deploy` 向 `.env` 配置的远端数据库应用成功。

执行前只读确认：运行时连接与迁移连接的迁移记录完全一致，既有两条迁移的文件校验和一致，仅本次装饰迁移待应用，目标字段尚不存在。执行后复核：三条迁移均已完成、无回滚或待执行项；新增字段为可空 `timestamp without time zone`、精度 3、无默认值；运行时连接读取该字段的空结果查询成功，未读取账号或信件内容。

```sql
BEGIN;
ALTER TABLE "namiya_store"."shops"
  ADD COLUMN "decorationOnboardedAt" TIMESTAMP(3);
COMMIT;
```

影响范围：只给现有 `shops` 追加一个可空时间字段，不新增表，不删除或回填布置、账号、信件及上传数据。已有行默认为 `NULL`，上线后首次进自己的店引导一次；保存或跳过才写入时间。前景草丛配置复用公开/草稿 JSON，缺省按显示处理。

本次远端追加迁移已完成，无需重复手动执行 SQL。回退应用时保留新增字段和装饰数据，不回写初始迁移；后续新增迁移仍需单独审阅。

## 外部待验与后续

远端结构已就绪，仍需使用真实账号验证登录、首次引导、跨设备恢复和访客读取。浏览器夹具的跨上下文检查与本地数据库检查不代表这些远端账号流程已完成。当前功能不调用新 AI、上传或朗读服务，未将模拟结果标记为真实外部联调通过。

素材不足的角色自由搭配、多款信箱、室外独立物体、贴纸、更多门面/实体牌匾/音乐及上传自由布置已逐项写入 [TODO](TODO.md)。
