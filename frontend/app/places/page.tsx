"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { MapSearchBar } from "@/components/places/MapSearchBar";
import { FilterDialog } from "@/components/places/FilterDialog";
import { PlaceDetailPanel } from "@/components/places/PlaceDetailPanel";
import { type PlaceFilterOptions } from "@/components/places/PlaceFilters";
import { placesApi, type Place } from "@/lib/api";
import { Hotel, Loader2, Info } from "lucide-react";

// Dynamically import LeafletMap to avoid SSR issues with Leaflet
const LeafletMap = dynamic(
  () => import("@/components/places/LeafletMap").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm font-medium text-gray-700">正在載入地圖...</p>
        </div>
      </div>
    ),
  }
);

function NTUPlacesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PlaceFilterOptions>({});
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [focusedPlaceId, setFocusedPlaceId] = useState<string>();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [showAllPlaces, setShowAllPlaces] = useState(false); // Toggle between NTU area and all places

  // Handle URL params on mount
  useEffect(() => {
    if (searchParams?.get("showAll") === "true") {
      setShowAllPlaces(true);
    }
  }, [searchParams]);

  // Use React Query for places data with caching
  const { data: placesData, isLoading, error } = useQuery({
    queryKey: ['places', showAllPlaces],
    queryFn: async () => {
      console.log('[Places Page] Fetching data...', { showAllPlaces });

      if (showAllPlaces) {
        // Load all places
        const data = await placesApi.list({ limit: 20000 });
        console.log('[Places Page] Received all places:', data.places.length);
        return data.places;
      } else {
        // Load NTU area places only
        const response = await fetch('http://localhost:3000/api/places/ntu?limit=1000');
        if (!response.ok) {
          console.error('[Places Page] API error:', response.status, response.statusText);
          throw new Error(`Failed to fetch NTU places: ${response.status}`);
        }
        const data = await response.json();
        console.log('[Places Page] Received NTU places:', data.places.length);
        return data.places;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log errors
  useEffect(() => {
    if (error) {
      console.error('[Places Page] Query error:', error);
    }
  }, [error]);

  const places = placesData || [];

  // Debug log
  useEffect(() => {
    console.log('[Places Page] Data loaded:', {
      placesCount: places.length,
      showAllPlaces,
      isLoading,
      firstPlace: places[0],
    });
  }, [places, showAllPlaces, isLoading]);

  // Apply filters and search
  const filteredPlaces = useMemo(() => {
    let result = [...places];

    // Type filter
    if (filters.type) {
      result = result.filter((place) => place.type === filters.type);
    }

    // Rating filter
    if (filters.minRating) {
      result = result.filter((place) => {
        const rating = place.googleRating || place.averageRating;
        return rating && rating >= filters.minRating!;
      });
    }

    // Price level filter
    if (filters.priceLevel) {
      result = result.filter(
        (place) => place.googlePriceLevel === filters.priceLevel
      );
    }

    // Privacy tags filter
    if (filters.privacyTags && filters.privacyTags.length > 0) {
      result = result.filter((place) => {
        if (!place.privacyTags) return false;
        return filters.privacyTags!.some((tag) =>
          place.privacyTags!.includes(tag)
        );
      });
    }

    return result;
  }, [places, filters]);

  const handleResetFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlaceId(place.id);
    setFocusedPlaceId(place.id);
  };

  const handleMarkerClick = (place: Place) => {
    setSelectedPlaceId(place.id);
    setSearchQuery(place.name);
  };

  const handleViewDetails = (place: Place) => {
    // No authentication required - just select the place to show details
    setSelectedPlaceId(place.id);
    setFocusedPlaceId(place.id);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">載入台大周邊旅宿資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Compact Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Hotel className="w-5 h-5" />
            <div>
              <h1 className="text-lg font-bold">台大周邊旅宿地圖</h1>
              <p className="text-xs text-muted-foreground">
                {showAllPlaces ? '雙北市全區' : '台大總區 · 台大醫院 · 台北車站'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant={showAllPlaces ? "outline" : "default"}
              size="sm"
              onClick={() => setShowAllPlaces(!showAllPlaces)}
            >
              {showAllPlaces ? '僅顯示台大周邊' : '顯示雙北全區'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://github.com/yourusername/ntu-places', '_blank')}
            >
              <Info className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">關於</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Full Screen Map with Floating Elements */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map (Full Screen) */}
        <LeafletMap
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          focusedPlaceId={focusedPlaceId}
          onMarkerClick={handleMarkerClick}
        />

        {/* Floating Search Bar (Top Center) */}
        <MapSearchBar
          places={filteredPlaces}
          onPlaceSelect={handlePlaceSelect}
          onFilterClick={() => setIsFilterDialogOpen(true)}
          activeFilterCount={Object.keys(filters).length}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* Map Legend (Bottom Left) */}
        <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg z-10">
          <div className="text-base font-semibold mb-3">圖例</div>
          <div className="space-y-2 text-base">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-600"></div>
              <span>飯店</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-pink-600"></div>
              <span>汽車旅館</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-orange-600"></div>
              <span>民宿</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            共 {filteredPlaces.length} 個場所
          </div>
        </div>

        {/* Right Side Detail Panel (Simplified - No auth required actions) */}
        {selectedPlaceId && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l shadow-xl z-20 overflow-y-auto">
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPlaceId(undefined)}
                className="mb-4"
              >
                ✕ 關閉
              </Button>
              {(() => {
                const place = filteredPlaces.find(p => p.id === selectedPlaceId);
                if (!place) return null;

                const typeLabels: Record<string, string> = {
                  hotel: "飯店",
                  motel: "汽車旅館",
                  short_stay: "民宿",
                };

                return (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{place.name}</h2>
                      <p className="text-sm text-muted-foreground">{typeLabels[place.type]}</p>
                    </div>

                    {place.googleRating && (
                      <div>
                        <p className="text-lg">⭐ {place.googleRating.toFixed(1)} / 5.0</p>
                        <p className="text-sm text-muted-foreground">
                          {place.googleRatingsTotal?.toLocaleString()} 則 Google 評論
                        </p>
                      </div>
                    )}

                    {place.address && (
                      <div>
                        <p className="text-sm font-medium">地址</p>
                        <p className="text-sm text-muted-foreground">{place.address}</p>
                      </div>
                    )}

                    {place.privacyTags && place.privacyTags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">特色標籤</p>
                        <div className="flex flex-wrap gap-2">
                          {place.privacyTags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-secondary text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`, '_blank')}
                      >
                        在 Google 地圖中查看
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`, '_blank')}
                      >
                        規劃路線
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Filter Dialog */}
        <FilterDialog
          open={isFilterDialogOpen}
          onOpenChange={setIsFilterDialogOpen}
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
        />
      </div>
    </div>
  );
}

export default function NTUPlacesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    }>
      <NTUPlacesContent />
    </Suspense>
  );
}
