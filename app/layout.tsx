import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "音声→WordPress自動投稿",
  description: "音声からAIが記事を生成し、WordPressへ自動投稿するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col overflow-x-hidden">
        {/* 装飾: 浮遊するグラデーションオーブ */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-float-slow absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(88,0,255,0.34),transparent_70%)] blur-2xl" />
          <div className="animate-float-slow absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(92,225,230,0.24),transparent_70%)] blur-2xl [animation-delay:-3s]" />
          <div className="animate-float-slow absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(120,60,255,0.22),transparent_70%)] blur-2xl [animation-delay:-6s]" />
        </div>
        {children}
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
