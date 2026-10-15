This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 网站图标与分享图片

图源位于 `public/icon.jpg`。执行 `node scripts/prepare-site-icons.mjs`，会裁去多余白边、保留 12px 安全边距，并生成透明背景的 `public/site-logo.png` 供左上角店名使用；同时重新生成 `app/favicon.ico`（16／32／48px）、`app/icon.png`（512px）、`app/apple-icon.png`（180px），以及 Open Graph／Twitter 分享图片。各尺寸保持原比例，Next.js 按文件约定自动输出图标和图片元数据。

正式部署时设置 `NEXT_PUBLIC_SITE_URL` 为完整站点地址（例如 `https://你的域名`），用于生成可被分享平台访问的图片绝对地址。Vercel 部署默认读取 `VERCEL_PROJECT_PRODUCTION_URL`；本地开发默认 `http://localhost:3000`。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
