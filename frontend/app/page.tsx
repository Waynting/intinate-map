"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Hotel, MapPin, Map } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="container flex max-w-5xl flex-col items-center gap-8 px-4 py-12 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <Hotel className="h-10 w-10" />
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            雙北市私密空間地圖
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            探索台北、新北地區的飯店、汽車旅館與民宿<br className="hidden sm:block" />
            <span className="text-sm">無需登入，完全開放的地圖查詢服務</span>
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={() => router.push("/places")}
            className="gap-2"
          >
            <MapPin className="h-5 w-5" />
            台大周邊地圖
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/places?showAll=true")}
            className="gap-2"
          >
            <Map className="h-5 w-5" />
            雙北全區地圖
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid w-full max-w-3xl grid-cols-3 gap-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center space-y-1">
            <p className="text-3xl font-bold">1,100+</p>
            <p className="text-sm text-muted-foreground">場所</p>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <p className="text-3xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">類型</p>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <p className="text-3xl font-bold">雙北</p>
            <p className="text-sm text-muted-foreground">覆蓋範圍</p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid w-full max-w-4xl gap-6 md:grid-cols-1">
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">互動式地圖</h3>
            <p className="text-sm text-muted-foreground">
              使用 Leaflet + OpenStreetMap 免費地圖服務，瀏覽超過 1,100 個場所
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 max-w-2xl rounded-lg border bg-muted/50 p-6 text-left">
          <h3 className="mb-3 font-semibold">關於本專案</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 涵蓋台北市與新北市超過 1,100 個住宿場所</li>
            <li>• 提供飯店、汽車旅館、民宿三大類型篩選</li>
            <li>• 使用免費的 OpenStreetMap 地圖圖資</li>
            <li>• 支援地圖標記聚合（Clustering），大量資料一目瞭然</li>
            <li>• 無需登入，所有資訊完全開放查詢</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto w-full border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          使用 OpenStreetMap 圖資 | 純展示型地圖應用
        </div>
      </footer>
    </div>
  );
}
