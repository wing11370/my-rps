import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "猜拳遊戲 Rock Paper Scissors",
  description: "Play Rock Paper Scissors with leaderboard",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="zh" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

export default RootLayout
