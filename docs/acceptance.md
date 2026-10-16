# 部署与验收记录

## 外部配置

代码默认不包含任何凭据；未配置时可以浏览四组内置场景、听音景、使用番茄钟，账号、真实信件和上传会明确返回未配置错误，不生成假账号、假收件或模板 AI 回信。

1. 将 `.env.example` 复制为 `.env.local`，填写已有 YQYHub Auth 配置、服务端 Storage key、指向 `namiya_store` 的两个数据库连接，以及 OpenAI key。不要将真实密钥提交到 Git。
2. 审阅 `prisma/migrations/20261015000000_initial/migration.sql`。它仅新增 `namiya_store` 业务 schema、外键与约束，以及 `namiya-private` 私桶和 `namiya-scenes` 公桶；不迁移或修改 RapperRank、ArtMind 业务表。
3. 对共享数据库的迁移应在批准后执行 `npm run db:deploy`。不要用 `prisma db push` 替代：迁移包含 Auth 外键、Storage 桶及权限配置。
4. 在 YQYHub 的 Authentication → Redirect URLs 中追加本地、预览和生产的 `/auth/callback` 地址，保留其他产品现有设置，不改写全局 Site URL。
5. 私桶必须保持 private，公桶仅存发布后的 WebP 场景；浏览器没有本产品业务表或私桶的 Data API 权限。
6. 配置生产完整 `NEXT_PUBLIC_SITE_URL`，运行 `npm run build`，再部署。

本轮未向共享 Supabase 应用迁移，未修改 OAuth 设置，未调用真实付费 AI / TTS；按用户要求未执行浏览器测试。远端已同步至 `8d509b5`，原有天气、日历、磁带和本地字体改动已合并保留。

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
