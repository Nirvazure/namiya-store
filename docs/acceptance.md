# 部署与验收记录

## 外部配置

代码默认不包含任何凭据；未配置时可以浏览四组内置场景、听音景、使用番茄钟，账号、真实信件和上传会明确返回未配置错误，不生成假账号、假收件或模板 AI 回信。

1. 本地从 `.env.example` 创建 `.env`，填写 `SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`、服务端 Storage key、指向 `namiya_store` 的 `DATABASE_URL`，以及 OpenAI key。Vercel 中关联同名的两个 Auth Shared 变量，选择所需的 Production、Preview、Development 环境；移除旧 `SUPABASE_KEY` 及项目级同名重复配置，然后重新部署。本地 `.env` 不会自动同步 Shared。不要将真实密钥提交到 Git。
2. 审阅 `prisma/migrations/20261015000000_initial/migration.sql`。它仅新增 `namiya_store` 业务 schema、外键与约束，以及 `namiya-private` 私桶和 `namiya-scenes` 公桶；不迁移或修改 RapperRank、ArtMind 业务表。
3. 数据库已完成部署，当前只保留 `DATABASE_URL`。迁移命令已移除，现有 SQL 历史保留用于审计和隔离测试。未来如需修改数据库，应单独设计和审阅变更，不在构建或启动时自动执行迁移。
4. 在 YQYHub 的 Authentication → Redirect URLs 中追加本地、预览和生产的 `/auth/callback` 地址，保留其他产品现有设置，不改写全局 Site URL。
5. 私桶必须保持 private，公桶仅存发布后的 WebP 场景；浏览器没有本产品业务表或私桶的 Data API 权限。
6. 无需配置站点地址变量：OAuth 使用当前请求的 origin，分享元数据使用 Vercel 自动提供的生产域名或部署域名。运行 `npm run build`，再部署；本地分享元数据默认使用 `http://localhost:3000`。

初次代码验收时未向共享 Supabase 应用迁移，未修改 OAuth 设置，未调用真实付费 AI / TTS；按用户要求未执行浏览器测试。当时远端已同步至 `8d509b5`，原有天气、日历、磁带和本地字体改动已合并保留。数据库后续执行结果见下方记录。

## 2026-10-16 数据库迁移验收

用户审阅并批准迁移方案后，已通过 `prisma migrate deploy` 成功应用 `20261015000000_initial`，迁移完成记录保存在 `namiya_store._prisma_migrations`。

- 已创建 `profiles`、`shops`、`uploads`、`threads`、`messages` 五张业务表，Prisma 对五个模型的读取均成功。
- 五张业务表均启用 RLS；已核对 `anon`、`authenticated` 均无直接 SELECT 权限，六个外键均符合迁移中的级联删除定义。
- 已创建私桶 `namiya-private`（15 MiB）和公桶 `namiya-scenes`（10 MiB，仅 WebP），属性与迁移一致。
- 本地 `/api/shops` 已由迁移前的 503 恢复为 200，返回空的用户店铺列表；`/api/me` 无会话请求返回 200、`configured: true`。
- 已确认 Supabase GitHub provider 启用，本地登录入口正常发起带 PKCE 的授权跳转。真实浏览器会话的登录完成状态、上传和 AI / TTS 仍需另行验收。

本次迁移未导入示例账号、店铺或信件，也未修改 OAuth 配置；配置凭据保留在被 Git 忽略的本地环境文件中。

## 自动化检查

`npm test` 同时运行新增 Vitest 测试与保留的上游 Node 测试；`npm run lint`、`npm run typecheck`、`npm run build` 检查静态质量和生产产物。新增测试覆盖匿名投影、第三方拒绝、保存与发布、图片实际格式及尺寸、幂等、限流、生成租约、语音失败恢复、草稿隔离和跨场景专注状态。

本轮自动化结果：58 项 Vitest、41 项上游 Node 测试、14 项真实 HTTP/SSR 检查通过；Lint、类型检查及生产构建通过。HTTP 检查使用无真实凭据的独立本地生产服务器，不启动浏览器。

业务测试使用隔离的模拟数据，不代表已经通过真实 YQYHub 的登录、数据库并发或 Storage 集成验证。

## 配置就绪后的人工验收场景

- 两个已有 YQYHub 账号可登录，首次进入幂等创建本产品资料；退出本站不会退出其他产品。
- 同账号并发保存开店仅有一条 owner 记录。未补齐名称和两张图不能发布。
- 上传原图仅本人能预览。修改草稿、上传失败或发布冲突不替换已发布资源组。
- 每家店的门面、室内、牌匾、默认音乐、收信对象保持一致，刷新分享链接仍进入同一家店。
- A 匿名给 B 的店写信，B 回信，A 续信；C 对相同通信及音频返回拒绝。匿名响应中不含 A 的 Auth UUID、头像、邮箱或小店链接。
- 连点、超时重试使用同一请求标识，不重复投递。暂停接信只阻止新通信；屏蔽后不能续信。
- 爷爷按当前通信生成回信，失败可重试；朗读失败保留文字，再次朗读命中私有缓存。
- 关闭面板、切店与刷新后番茄钟正确恢复；不会自动播放音乐，朗读结束恢复访客自己的音量。
- 旧版 `namiya.recent-letter` 通过“本机旧信”读取，不自动归入任何登录账号。
