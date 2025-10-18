"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { authApi, placesApi, type Place } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Search,
  Trash2,
  Edit,
  Eye,
  Star,
} from "lucide-react";

export default function PlacesAdminPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authApi.isAuthenticated() || !authApi.isAdmin()) {
      router.push("/");
      return;
    }
    loadPlaces();
  }, [router]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPlaces(places);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPlaces(
        places.filter(
          p =>
            p.name.toLowerCase().includes(query) ||
            p.address?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, places]);

  const loadPlaces = async () => {
    setIsLoading(true);
    try {
      const data = await placesApi.list({ limit: 20000 });
      setPlaces(data.places);
      setFilteredPlaces(data.places);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: "無法載入場所列表",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlace = async (placeId: string, placeName: string) => {
    if (!confirm(`確定要刪除「${placeName}」嗎？此操作無法復原。`)) return;

    try {
      await placesApi.delete(placeId);
      toast({
        title: "刪除成功",
        description: "場所已刪除",
      });
      setPlaces(places.filter(p => p.id !== placeId));
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: "無法刪除場所",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotel: "飯店",
      motel: "汽車旅館",
      short_stay: "民宿",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回管理後台
            </Button>
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold">場所管理</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="mb-6">
          <CardHeader className="space-y-3">
            <CardTitle>搜尋場所</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋場所名稱或地址..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>場所列表</CardTitle>
            <CardDescription className="mt-2">
              共 {filteredPlaces.length} 個場所
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPlaces.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="找不到場所"
                description={
                  searchQuery.trim()
                    ? `沒有符合「${searchQuery}」的場所。試試其他關鍵字。`
                    : "目前系統中沒有任何場所。"
                }
                primaryAction={
                  searchQuery.trim()
                    ? {
                        label: "清除搜尋",
                        onClick: () => setSearchQuery(""),
                      }
                    : {
                        label: "瀏覽所有場所",
                        onClick: () => router.push("/places"),
                      }
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="border rounded-lg p-5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{place.name}</h3>
                          <Badge variant="secondary">
                            {getTypeLabel(place.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {place.address}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {place.googleRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span>{place.googleRating.toFixed(1)}</span>
                              <span className="text-xs">
                                ({place.googleRatingsTotal?.toLocaleString()})
                              </span>
                            </div>
                          )}
                          <span>{place.reviewCount} 則評論</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/places/${place.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/places/edit/${place.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編輯
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePlace(place.id, place.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          刪除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
