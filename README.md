# 解忧杂货店

一个可以专注、写下心事，也可以为别人回信的小空间。每个账号可以拥有一家小店，每家店有成对的室外门面与室内场景。

## 已实现

- 共享 YQYHub / Supabase Auth，GitHub 登录，一人一店，独立 `namiya_store` 业务 schema。
- 四家内置小店各自对应室内外；新增三张门面整图沿用用户素材，不做切图。保留天气日历、磁带音乐、陪伴物件与原店内互动。
- 四步开店：资料、双场景配置、进出预览、确认发布。支持模板和整图上传、位置缩放、牌匾覆盖、音乐与接信配置；草稿和已发布资源分离。
- 私密真人收发信、续信、匿名或主动署名、未读、限流和屏蔽；重复提交与超时重试使用幂等标识。
- 爷爷 AI 回信、同一通信上下文、租约防重与失败重试。点击后才生成朗读，音频私有缓存，朗读期间降低背景音量。
- 番茄钟按结束时间恢复，切店与关闭面板不影响计时；音乐偏好按小店保存，进入页面不自动播放。

游客可逛店、听音乐和专注；开店、投信、查看账号历史需要登录。系统示例店暂不接真人来信，爷爷默认接信。

## 开发与配置

使用 Node.js 24 与 npm。当前同时保留远端已有的 `yarn.lock`，本次新增依赖以 `package-lock.json` 和 npm 脚本为准，部署时请选择 npm。

```powershell
npm ci
Copy-Item .env.example .env.local
# 填写本地环境变量后：
npm run db:generate
npm run dev
```

无密钥也可以构建并浏览内置场景，服务端不会用假账号、假信件或模板 AI 回复代替未配置的服务。数据库、OAuth 回调及 Storage 的部署步骤见 [部署与验收](docs/acceptance.md)。共享数据库迁移需要先审阅 SQL，再执行 `npm run db:deploy`；不要使用 `prisma db push`。

账号共用 Supabase `auth.users.id`，各站独立建立会话；不读取其他应用的业务资料，也不继承其管理员角色。本站退出仅清除本站会话。

## 验证

```powershell
npm test               # 新增业务测试 + 保留的上游回归测试
npm run lint
npm run typecheck
npm run build
npm run test:http      # 生产构建后的纯 HTTP / SSR 烟测，不启动浏览器
```

自动化测试不调用真实 YQYHub、付费 AI 或 TTS。真实登录、跨设备通信、Storage 权限与数据库并发验收仍需配置环境后执行。本轮按用户要求不做浏览器测试。

## 场景与资源

`domain/shops.ts` 定义四家内置店及其室内外配对。`SceneAsset` 同时支持 `image` 和 `layers`：已有分层场景继续使用，新上传图片按整图展示。原图和草稿保存在私有桶；用户确认后才制作公开 WebP 展示资源。私密信件和语音不进入公开资源桶。

个人小店地址为 `/shops/[shopId]`。四家内置地址为 `/shops/grandpa`、`/shops/sashimi`、`/shops/dessert`、`/shops/matcha`。当前三张新增门面按文件顺序对应刺身、甜品、抹茶，配对可以通过配置调整。

自动拆图、背景补全、用户确认生成资源、小镇地图等后续项目见 [产品待办](docs/TODO.md)。

## 网站图标与分享图片

图源位于 `public/icon.jpg`。执行 `node scripts/prepare-site-icons.mjs`，会裁去多余白边、保留 12px 安全边距，并生成透明背景的 `public/site-logo.png`；同时重新生成 `app/favicon.ico`、`app/icon.png`、`app/apple-icon.png`，以及 Open Graph／Twitter 分享图片。各尺寸保持原比例，Next.js 按文件约定输出图标和图片元数据。

正式部署时设置 `NEXT_PUBLIC_SITE_URL` 为完整站点地址。Vercel 部署默认读取 `VERCEL_PROJECT_PRODUCTION_URL`；本地默认 `http://localhost:3000`。字体沿用远端新增的本地字体，不依赖构建期间下载 Google Fonts。
