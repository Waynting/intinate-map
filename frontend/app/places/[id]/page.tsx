"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { placesApi, type Place } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Star,
  ExternalLink,
  Navigation,
  Hotel,
} from "lucide-react";

export default function PlaceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadPlace();
  }, [resolvedParams.id]);

  const loadPlace = async () => {
    setIsLoading(true);
    try {
      const placeData = await placesApi.get(resolvedParams.id);
      setPlace(placeData);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: "無法載入場所資料",
        variant: "destructive",
      });
      router.push("/places");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">找不到此場所</p>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    hotel: "飯店",
    motel: "汽車旅館",
    short_stay: "民宿",
  };

  const privacyTagLabels: Record<string, string> = {
    self_checkin: "自助入住",
    soundproof: "隔音良好",
    private_parking: "私人停車",
    discreet_entrance: "隱密入口",
    garage: "車庫",
    cash_only: "僅收現金",
    kiosk: "自助服務機",
    hourly_rate: "計時收費",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/places")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回地圖
          </Button>
          <div className="flex items-center gap-2">
            <Hotel className="w-5 h-5" />
            <span className="font-semibold">台大周邊旅宿地圖</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{place.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="mr-2">
                    {typeLabels[place.type]}
                  </Badge>
                  {place.source === "user" && (
                    <Badge variant="outline">用戶新增</Badge>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Rating */}
            {place.googleRating && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{place.googleRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 5.0</span>
                </div>
                {place.googleRatingsTotal && (
                  <span className="text-sm text-muted-foreground">
                    ({place.googleRatingsTotal.toLocaleString()} 則 Google 評論)
                  </span>
                )}
              </div>
            )}

            {/* Address */}
            {place.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">地址</p>
                  <p className="text-muted-foreground">{place.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    座標: {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            )}

            {/* Privacy Tags */}
            {place.privacyTags && place.privacyTags.length > 0 && (
              <div>
                <p className="font-medium mb-2">特色標籤</p>
                <div className="flex flex-wrap gap-2">
                  {place.privacyTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {privacyTagLabels[tag] || tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <Button
                size="lg"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
                    "_blank"
                  )
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                在 Google 地圖中查看
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`,
                    "_blank"
                  )
                }
              >
                <Navigation className="w-4 h-4 mr-2" />
                規劃路線
              </Button>
            </div>

            {/* Info Note */}
            <div className="bg-muted/50 rounded-lg p-4 mt-6">
              <p className="text-sm text-muted-foreground">
                💡 <strong>台大版本說明:</strong> 此版本為簡化查詢版本,無需登入即可使用。
                如需更詳細資訊或 Google 評論,請點擊「在 Google 地圖中查看」。
              </p>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                資料來源: {place.source === "user" ? "用戶新增" : "政府開放資料"}
                {" · "}
                更新時間: {new Date(place.updatedAt).toLocaleDateString("zh-TW")}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
