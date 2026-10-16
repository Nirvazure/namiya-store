import type { Metadata } from "next";
import localFont from "next/font/local";
import { CompanionRuntime } from "@/components/companions/CompanionRuntime";
import { ExperienceRoot } from "@/components/ExperienceRoot";
import "./globals.css";
import "./book-font.css";

const book = localFont({
  src: [
    { path: "../public/fonts/namiya-book-regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/namiya-book-medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-book",
  display: "swap",
  adjustFontFallback: false,
});

const brush = localFont({
  src: "../public/fonts/namiya-brush.woff2",
  variable: "--font-brush",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const siteTitle = "解忧杂货店";
const siteDescription = "沿着水彩旧街走进解忧杂货店，在一盏暖灯下写信，安放今晚的心事。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${book.variable} ${brush.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><CompanionRuntime /><ExperienceRoot />{children}</body>
    </html>
  );
}
