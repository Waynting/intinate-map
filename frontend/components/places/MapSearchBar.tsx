"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Place } from "@/lib/api";

interface MapSearchBarProps {
  places: Place[];
  onPlaceSelect: (place: Place) => void;
  onFilterClick: () => void;
  activeFilterCount: number;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function MapSearchBar({
  places,
  onPlaceSelect,
  onFilterClick,
  activeFilterCount,
  searchQuery,
  onSearchQueryChange,
}: MapSearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter places based on search query
  const suggestions = searchQuery.trim()
    ? places.filter(
        (place) =>
          place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          place.address?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8) // Limit to 8 suggestions
    : [];

  // Show suggestions when there's input and matches
  useEffect(() => {
    setShowSuggestions(searchQuery.trim().length > 0 && suggestions.length > 0);
    setHighlightedIndex(-1);
  }, [searchQuery, suggestions.length]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectPlace(suggestions[highlightedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectPlace(suggestions[0]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectPlace = (place: Place) => {
    onPlaceSelect(place);
    onSearchQueryChange(place.name);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleClearSearch = () => {
    onSearchQueryChange("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      hotel: "飯店",
      motel: "汽車旅館",
      short_stay: "民宿",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      hotel: "bg-emerald-500",
      motel: "bg-pink-500",
      short_stay: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <div
      ref={searchRef}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-2xl"
    >
      {/* Search Input Container */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-background rounded-lg shadow-lg border py-1">
          {/* Search Icon */}
          <div className="pl-4 pr-2">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Input Field */}
          <Input
            ref={inputRef}
            type="text"
            placeholder="搜尋場所、地址..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchQuery.trim() && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg h-12"
          />

          {/* Clear Button */}
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="mr-1"
            >
              <X className="w-5 h-5" />
            </Button>
          )}

          {/* Divider */}
          <div className="h-10 w-px bg-border" />

          {/* Filter Button */}
          <Button
            variant="ghost"
            size="default"
            onClick={onFilterClick}
            className="mr-2 gap-2 text-base"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden sm:inline">篩選</span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1 h-6 w-6 p-0 flex items-center justify-center text-sm">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute top-full mt-2 w-full bg-background rounded-lg shadow-xl border max-h-96 overflow-y-auto">
            <div className="py-2">
              {suggestions.map((place, index) => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-5 py-4 flex items-start gap-3 hover:bg-accent transition-colors ${
                    index === highlightedIndex ? "bg-accent" : ""
                  }`}
                >
                  {/* Type Color Indicator */}
                  <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${getTypeColor(place.type)}`} />

                  {/* Place Info */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-base mb-1">{place.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getTypeLabel(place.type)}</span>
                      {place.googleRating && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            ⭐ {place.googleRating.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    {place.address && (
                      <div className="text-sm text-muted-foreground mt-1 truncate">
                        {place.address}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div className="border-t px-5 py-3 text-sm text-muted-foreground bg-muted/50">
              <span className="hidden sm:inline">↑↓ 選擇 • </span>
              <span className="hidden sm:inline">Enter 確認 • </span>
              <span>共 {suggestions.length} 個結果</span>
            </div>
          </div>
        )}
      </div>

      {/* No Results Message */}
      {searchQuery.trim() && !showSuggestions && suggestions.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-background rounded-lg shadow-xl border">
          <EmptyState
            icon="🔍"
            title="找不到相關場所"
            description={`沒有符合「${searchQuery}」的搜尋結果。試試其他關鍵字，或調整篩選條件。`}
            primaryAction={{
              label: "清除搜尋",
              onClick: handleClearSearch,
            }}
            secondaryAction={
              activeFilterCount > 0
                ? {
                    label: "重設篩選",
                    onClick: onFilterClick,
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
