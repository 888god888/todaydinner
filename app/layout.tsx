import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "晚餐快選｜熟店與新店，今晚換著吃",
  description: "依預算、種類、生活圈與營業時段推薦晚餐；不喜歡換一批，確認吃了才留下紀錄。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
