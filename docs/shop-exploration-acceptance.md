# 小店漫游交付与验收记录

日期：2026-10-16。分支：`codex/personal-shops`。

## React 复核与提交整理

按 `react-best-practices` 完成复核：室内场景和本人信箱改用 `next/dynamic` 按需加载，进店前并行准备代码和图片；图标使用独立模块导入。Effect 分离信件上下文、音乐选择与登录草稿恢复，按必要的账号/店铺标识订阅。未读刷新共享在途请求，店铺状态刷新禁止重叠，并通过版本号防止旧结果覆盖营业和收藏修改；退出和账号切换使私有请求失效。收藏分页合并用 Set 去重，无变化的收藏状态保留原数组。

复验通过 83 项单元、41 项旧版、15 项 HTTP 检查、Lint、独立类型检查与生产构建。四种宽度的基础浏览器流程及 375/1440px 账号流程通过，补验同时触发聚焦/可见性事件只发送一次未读请求、退出清空私有收藏。未对性能提升比例作测量。

提交保留产品设计、迁移 SQL、回归脚本与验收证据；删除只记录会话执行进度的临时计划文档。截图、缓存、测试数据库目录与生产构建产物不进入版本库。

## 已实现的首次交付

每个登录账号幂等获得默认公开小店，已有公开布置和私有草稿保留。共享布局承载账号、音乐和番茄钟；标准地址为 `/shop/[shopId]`，旧复数地址永久跳转并保留查询参数。

单行头像昵称、本人/官方/收藏头像导航、随机发现、浏览历史、按钮/方向键/水平拖动、收藏、营业/发现/接信设置和静态关店已接入。本人实体信箱读取全部往来；别人店的信箱写信和投递，投递后留在当前店。爷爷首次和续信投递由服务端 `after()` 调度，客户端保留失败和超时重试。

旧顶部工具栏、目录入口、本机旧信面板和布置弹窗入口已移除；浏览器历史存储不删除、不自动导入账号。独立布置页、关灯/亮灯动画保留后续实施。

## 本地验收

| 检查 | 结果与实际范围 |
| --- | --- |
| Vitest | 83 项通过，含默认店、权限、幂等、发现游标、关店、草稿隔离、服务端生成调度和原有生成租约 |
| 旧版 Node 测试 | 41 项通过，账号预期已更新，原天气、日历、音乐、番茄钟检查保留 |
| Lint | 全仓库 ESLint 通过 |
| TypeScript | 独立 `tsc --noEmit --incremental false` 通过，生产构建内类型检查也通过 |
| 生产构建 | Next.js 16.2.9 Turbopack 完成编译、类型检查、21 个页面生成与路由收集；此前停在编译阶段的问题本轮没有复现到最终失败 |
| HTTP/SSR | 15 项通过；独立生产服务移除真实凭据，覆盖标准地址、旧地址 308、公开字段与未登录拒绝 |
| 浏览器基础流程 | 375、768、1024、1440px；室内外、单行账号、写信、漫游、历史、方向键、手势隔离、计时连续；无页面运行错误 |
| 浏览器账号流程 | 375、1440px；控制接口夹具验证首页回本人店、营业设置、收藏、投递后留店、本人信箱、收藏店关店、浏览器前后退、刷新、长昵称与头像失败回退；无页面运行错误 |
| 天气浏览器回归 | 清晨/白天/黄昏/夜晚 × 7 种天气共 28 组，加移动端草稿/登录/伴随工具与定位拒绝共 30 组通过；天气使用接口夹具，公开地点查询在正常网络环境完成，无运行或水合错误 |
| 真实 PostgreSQL | 独立本地 PostgreSQL 18，执行原始初始迁移与本次追加 SQL；不使用远端或业务账号数据 |

数据库实测覆盖：接信回填、旧公开店保留、草稿店补齐公开模板且不泄露草稿、并发初始化唯一、关店持行锁时新投递等待并拒绝、旧通信可续信、并发收藏唯一、收藏保留关店店铺、随机过滤、种子游标分页稳定且不重复、发布不覆盖接信设置、删除店铺级联清理收藏、RLS 和浏览器角色直接权限。

真实数据库测试发现并修复两项仅靠 Mock 不易发现的问题：`SELECT FOR UPDATE` 的序列化冲突以 Prisma `P2010 / 40001` 返回，现已纳入有限重试；复合主键 `upsert` 并发收藏仍可能冲突，已改用 `INSERT ... ON CONFLICT DO NOTHING` 对应的 `createMany / skipDuplicates`。

浏览器账号流程采用受控 HTTP 夹具，不代表真实 OAuth、两个远端账号互寄或真实 AI 已通过。真实 AI、Storage 上传及朗读未调用，需在对应环境准备好后分别联调。远端追加迁移已于 2026-10-16 经用户授权执行并复核；完整发布验收仍待真实账号流程和上述外部服务检查。

本轮仅检查环境变量是否设置：Auth 和数据库连接已提供，`SUPABASE_SERVICE_ROLE_KEY` 与 `OPENAI_API_KEY` 为空，因此上传、真实生成与朗读未能联调；未输出或写入凭据。

## 复验命令

```powershell
node node_modules/vitest/vitest.mjs run
node --import ./tests/register.mjs --test tests/*.test.mjs
node node_modules/eslint/bin/eslint.js
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
node tests/http-smoke.mjs
```

构建前通常运行 `npm run db:generate`。本机正在运行的旧开发服务锁定 Prisma 引擎 DLL，生成器尝试替换 DLL 会报 EPERM；客户端模型已更新并经上述真实 PostgreSQL 测试验证。完整 `npm run build` 的生成步骤应在关闭占用该 DLL 的开发服务后复验；本轮生产构建使用直接 `next build`，未停止用户的开发服务。

浏览器脚本使用本机 Playwright 与 Chrome，可通过 `PLAYWRIGHT_MODULE`、`BROWSER_EXECUTABLE` 指定路径；`INDOOR_TEST_URL` 指向独立生产服务，随后运行 `tests/browser-indoor.mjs`、`tests/browser-exploration.mjs`。

数据库脚本 `tests/database-exploration.mjs` 需要单独安装的 `embedded-postgres`；将 `EMBEDDED_POSTGRES_MODULE` 设为其 `dist/index.js` 的绝对路径，再运行：

```powershell
node --conditions=react-server --import ./tests/register.mjs tests/database-exploration.mjs
```

脚本强制创建本地临时数据库并覆盖当前进程连接，不会使用 `.env` 的远端数据库。测试工具仅安装在被忽略的 `node_modules/.cache`，未修改项目依赖清单。

## 远端迁移执行记录

精确 SQL：[20261016000000_shop_exploration/migration.sql](../prisma/migrations/20261016000000_shop_exploration/migration.sql)。此文件先在上述本地 PostgreSQL 执行通过，随后于 2026-10-16 经用户明确授权，使用项目现有 `prisma migrate deploy` 向 `.env` 配置的远端数据库应用成功。

迁移前只读检查确认：远端只有初始迁移，新增五列及收藏表缺失；Prisma 查询复现 `P2022 / shops.isOpen`，导致身份验证成功后小店初始化失败。执行前再次确认运行时与迁移连接指向同一数据库，且仅本次追加迁移待应用。

执行后只读复核通过：两条迁移记录均已完成且未回滚；新增五列与收藏表的 Prisma 查询成功；接信回填差异为零；两个查询索引、收藏联合主键及两条级联外键存在；收藏表已启用 RLS，anon 和 authenticated 均无直接读写权限。未查询或记录账号身份、信件正文及凭据。浏览器登录会话中的自动建店和收发信仍需实际流程验证。

影响范围：

- `namiya_store.shops` 追加五个字段：三个营业布尔值、公开昵称和头像快照；回填接信设置，并新增发现查询索引。
- 新增 `namiya_store.shop_favorites`，以用户和店铺为联合主键；关联现有 Auth 用户及店铺，删除时级联清理。
- 收藏表启用 RLS，撤销 PUBLIC、anon、authenticated 直接权限，所有访问经过服务端。
- 保留原有五张业务表、店铺 ID、信件、上传与草稿，不改写初始迁移，不修改其他产品业务表或 OAuth 设置。
- 追加迁移会短暂锁定 `shops` 并扫描回填现有行；应在合适窗口执行。应用回退保留新增字段和收藏表。

远端迁移已完成，无需重复手动执行 SQL。后续追加迁移仍遵循单独审阅流程；新服务依赖相应数据库结构，代码部署应与迁移配合。

## 发布后检查

核对两个真实账号默认店与收发信、收藏关店、停止发现仍可链接访问、游客登录返回原店及草稿、真实爷爷回信与失败重试。观察初始化失败、发现错误、投递冲突和生成超时；日志只保留类别与关联 ID，不记录信件正文或凭据。
