import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/lib/queryClient";

export const metadata: Metadata = {
  title: "心生 - 雙北市旅宿地圖",
  description: "探索台北市與新北市旅宿空間 - 飯店、汽車旅館、民宿推薦與評價平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
