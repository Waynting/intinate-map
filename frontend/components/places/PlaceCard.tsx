"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Place } from "@/lib/api";
import { favoritesApi } from "@/lib/api";
import { MapPin, Star, DollarSign, MessageSquare, Flag, Edit, Trash2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlaceCardProps {
  place: Place;
  onViewDetails?: (place: Place) => void;
  onAddReview?: (place: Place) => void;
  onReport?: (place: Place) => void;
  onEdit?: (place: Place) => void;
  onDelete?: (place: Place) => void;
  onClick?: (place: Place) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function PlaceCard({
  place,
  onViewDetails,
  onAddReview,
  onReport,
  onEdit,
  onDelete,
  onClick,
  currentUserId,
  isAdmin = false,
}: PlaceCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const { toast } = useToast();
  const isOwner = currentUserId === place.createdBy;
  const canEdit = isOwner || isAdmin;

  // Check if place is favorited on mount
  useEffect(() => {
    // Only check favorites if user is authenticated (has both userId and token)
    if (currentUserId && typeof window !== 'undefined' && localStorage.getItem('token')) {
      checkFavoriteStatus();
    }
  }, [place.id, currentUserId]);

  const checkFavoriteStatus = async () => {
    // Double-check authentication before API call
    if (!currentUserId || !localStorage.getItem('token')) {
      return;
    }

    try {
      const { isFavorited: favorited } = await favoritesApi.check(place.id);
      setIsFavorited(favorited);
    } catch (error) {
      // Silently fail - user might not be authenticated
      console.log('Could not check favorite status');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentUserId) {
      toast({
        title: "請先登入",
        description: "登入後才能收藏場所",
        variant: "default",
      });
      return;
    }

    setIsLoadingFavorite(true);
    try {
      if (isFavorited) {
        await favoritesApi.removeByPlace(place.id);
        setIsFavorited(false);
        toast({
          title: "已取消收藏",
          description: `已從收藏中移除 ${place.name}`,
        });
      } else {
        await favoritesApi.add(place.id);
        setIsFavorited(true);
        toast({
          title: "收藏成功",
          description: `已將 ${place.name} 加入收藏`,
        });
      }
    } catch (error: any) {
      toast({
        title: isFavorited ? "取消收藏失敗" : "收藏失敗",
        description: error.response?.data?.message || "操作失敗，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const typeLabels: Record<string, string> = {
    hotel: "飯店",
    motel: "汽車旅館",
    short_stay: "民宿",
  };

  const privacyTagLabels: Record<string, string> = {
    self_checkin: "自助入住",
    soundproof: "隔音良好",
    garage: "室內停車",
    cash_only: "僅收現金",
    kiosk: "自助機台",
    hourly_rate: "鐘點房",
    no_id_required: "免證件",
    parking_inside: "停車入內",
  };

  const priceLevelSymbols = (level: number | null) => {
    if (level === null || level === 0) return null;
    return "💲".repeat(level);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick?.(place)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{place.name}</CardTitle>
              <Badge variant="secondary">{typeLabels[place.type]}</Badge>
            </div>
            <CardDescription className="mt-1">
              {place.address || "無地址資訊"}
            </CardDescription>
          </div>
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={handleToggleFavorite}
            disabled={isLoadingFavorite}
            title={isFavorited ? "取消收藏" : "加入收藏"}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isFavorited
                  ? "fill-red-500 text-red-500"
                  : "text-gray-400 hover:text-red-400"
              } ${isLoadingFavorite ? "opacity-50" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Location */}
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {place.address || `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`}
          </span>
        </div>

        {/* Google Rating */}
        {place.googleRating && place.googleRatingsTotal && (
          <div className="flex items-center text-sm">
            <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{place.googleRating.toFixed(1)}</span>
            <span className="text-muted-foreground ml-1">
              ({place.googleRatingsTotal.toLocaleString()} Google 評論)
            </span>
            {place.googlePriceLevel && (
              <span className="ml-2">{priceLevelSymbols(place.googlePriceLevel)}</span>
            )}
          </div>
        )}

        {/* User Reviews */}
        {place.reviewCount > 0 && (
          <div className="flex items-center text-sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="font-medium">
              {place.averageRating ? place.averageRating.toFixed(1) : "N/A"}
            </span>
            <span className="text-muted-foreground ml-1">
              ({place.reviewCount} 則用戶評論)
            </span>
          </div>
        )}

        {/* Privacy Tags */}
        {place.privacyTags && place.privacyTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {place.privacyTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {privacyTagLabels[tag] || tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Source Badge */}
        {place.source && place.source !== "user" && (
          <div className="text-xs text-muted-foreground">
            資料來源: {place.source === "government" ? "政府開放資料" : place.source}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 flex-wrap">
        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 min-w-[100px]"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(place);
          }}
        >
          查看詳情
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1 min-w-[100px]"
          onClick={(e) => {
            e.stopPropagation();
            onAddReview?.(place);
          }}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          評論
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onReport?.(place);
          }}
        >
          <Flag className="w-4 h-4 mr-1" />
          檢舉
        </Button>

        {/* Admin/Owner Actions */}
        {canEdit && (
          <>
            <div className="w-full border-t my-2" />
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(place);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              編輯
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(place);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              刪除
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
