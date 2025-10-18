"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlaceCard } from "@/components/places/PlaceCard";
import type { Place } from "@/lib/api";
import { ChevronUp, ChevronDown, X } from "lucide-react";

interface ResultsDrawerProps {
  places: Place[];
  selectedPlaceId?: string;
  onPlaceClick: (place: Place) => void;
  onViewDetails: (place: Place) => void;
  onAddReview: (place: Place) => void;
  onReport: (place: Place) => void;
  onEdit?: (place: Place) => void;
  onDelete?: (place: Place) => void;
  currentUserId?: string;
  isAdmin: boolean;
}

export function ResultsDrawer({
  places,
  selectedPlaceId,
  onPlaceClick,
  onViewDetails,
  onAddReview,
  onReport,
  onEdit,
  onDelete,
  currentUserId,
  isAdmin,
}: ResultsDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    // Show button to reveal drawer
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <Button
          onClick={() => setIsVisible(true)}
          className="shadow-lg"
          size="lg"
        >
          顯示結果列表 ({places.length})
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-10 bg-background border-t shadow-2xl transition-all duration-300 ${
        isExpanded ? "h-96" : "h-20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
            <span className="font-semibold">
              {places.length} 個場所
            </span>
          </Button>

          {places.length === 0 && (
            <span className="text-sm text-muted-foreground">
              沒有符合條件的場所
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content - Horizontal scroll for cards */}
      {isExpanded && (
        <div className="h-[calc(100%-56px)] overflow-y-auto p-4">
          {places.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="mb-2">找不到符合條件的場所</p>
                <p className="text-sm">請調整篩選條件或搜尋關鍵字</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {places.map((place) => (
                <div
                  key={place.id}
                  className={`transition-all ${
                    place.id === selectedPlaceId
                      ? "ring-2 ring-primary ring-offset-2 rounded-lg"
                      : ""
                  }`}
                >
                  <PlaceCard
                    place={place}
                    onClick={onPlaceClick}
                    onViewDetails={onViewDetails}
                    onAddReview={onAddReview}
                    onReport={onReport}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed view - Show horizontal scroll */}
      {!isExpanded && places.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {places.slice(0, 10).map((place) => (
              <button
                key={place.id}
                onClick={() => onPlaceClick(place)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg border bg-background hover:bg-accent transition-colors ${
                  place.id === selectedPlaceId
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="text-sm font-medium text-left whitespace-nowrap">
                  {place.name}
                </div>
                {place.googleRating && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ⭐ {place.googleRating.toFixed(1)}
                  </div>
                )}
              </button>
            ))}
            {places.length > 10 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="flex-shrink-0 px-4 py-2 rounded-lg border border-dashed border-muted-foreground/50 hover:border-primary hover:bg-accent transition-colors"
              >
                <div className="text-sm font-medium text-muted-foreground">
                  +{places.length - 10} 個
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
