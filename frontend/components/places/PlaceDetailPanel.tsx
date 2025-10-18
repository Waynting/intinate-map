"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Place } from "@/lib/api";
import {
  X,
  MapPin,
  Star,
  DollarSign,
  ExternalLink,
  Navigation,
} from "lucide-react";

interface PlaceDetailPanelProps {
  place: Place | null;
  onClose: () => void;
}

export function PlaceDetailPanel({
  place,
  onClose,
}: PlaceDetailPanelProps) {
  const router = useRouter();

  if (!place) return null;

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

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      hotel: "bg-emerald-100 text-emerald-700 border-emerald-300",
      motel: "bg-pink-100 text-pink-700 border-pink-300",
      short_stay: "bg-orange-100 text-orange-700 border-orange-300",
    };
    return colors[type] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getPriceLevel = (level?: number | null): string => {
    if (!level) return "未知";
    return "💲".repeat(level);
  };

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(url, "_blank");
  };

  const handleViewOnGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    window.open(url, "_blank");
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[450px] md:w-[500px] bg-background border-l shadow-2xl overflow-y-auto z-20 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur border-b z-10">
        <div className="p-5 flex items-start justify-between">
          <div className="flex-1 mr-4">
            <h2 className="text-2xl font-bold mb-2 line-clamp-2">{place.name}</h2>
            <Badge variant="outline" className={`${getTypeColor(place.type)} border text-sm px-3 py-1`}>
              {typeLabels[place.type] || place.type}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Rating & Price */}
        {(place.googleRating || place.googlePriceLevel) && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              {place.googleRating && (
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-3xl font-bold">{place.googleRating.toFixed(1)}</span>
                  {place.googleRatingsTotal && (
                    <span className="text-base text-muted-foreground">
                      ({place.googleRatingsTotal.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
              {place.googlePriceLevel && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-base font-medium">{getPriceLevel(place.googlePriceLevel)}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Address */}
        {place.address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-6 h-6 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-base text-muted-foreground mb-3">{place.address}</p>
              <Button
                variant="outline"
                size="default"
                onClick={handleDirections}
                className="w-full gap-2 text-base"
              >
                <Navigation className="w-5 h-5" />
                開啟 Google 地圖導航
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Privacy Tags */}
        {place.privacyTags && place.privacyTags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">特色標籤</h3>
            <div className="flex flex-wrap gap-2">
              {place.privacyTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {privacyTagLabels[tag] || tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            onClick={handleViewOnGoogleMaps}
          >
            <ExternalLink className="w-4 h-4" />
            在 Google 地圖中查看
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleDirections}
          >
            <Navigation className="w-4 h-4" />
            規劃路線
          </Button>
        </div>

        {/* Google Place ID (for debugging) */}
        {place.googlePlaceId && (
          <div className="text-xs text-muted-foreground pt-4">
            <p>Google Place ID: {place.googlePlaceId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
