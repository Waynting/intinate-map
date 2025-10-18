"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface LeafletMapProps {
  places: Place[];
  onMarkerClick?: (place: Place) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } }) => void;
  onPlaceAction?: (action: string, placeId: string) => void;
  selectedPlaceId?: string;
  focusedPlaceId?: string;
}

export function LeafletMap({
  places,
  onMarkerClick,
  onMapClick,
  onBoundsChange,
  selectedPlaceId,
  focusedPlaceId
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasSetInitialBoundsRef = useRef(false); // Track if initial bounds have been set

  // Debug: Log places data on mount and update (development only)
  useEffect(() => {
    console.log('[LeafletMap] Received places:', {
      count: places.length,
      samplePlace: places[0],
      isLoaded,
      leafletMapExists: !!leafletMapRef.current,
    });
  }, [places, isLoaded]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize map
  useEffect(() => {
    // Prevent duplicate initialization
    if (leafletMapRef.current || !mapRef.current) {
      return;
    }

    // Center on NTU Main Campus (台大總區)
    const center: [number, number] = [25.0174, 121.5393];

    // Create map instance with Google Maps-like settings
    const map = L.map(mapRef.current, {
      center: center,
      zoom: 13,
      zoomControl: true,
      minZoom: 10,
      maxZoom: 19,
      zoomSnap: 0.5,            // Larger zoom steps
      zoomDelta: 1,             // Larger zoom increment (more noticeable)
      wheelPxPerZoomLevel: 40,  // Faster scroll zoom (less pixels needed)
      doubleClickZoom: true,
      scrollWheelZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      inertia: true,            // Enable momentum scrolling
      inertiaDeceleration: 3000, // Google Maps-like deceleration
      inertiaMaxSpeed: 1500,    // Smooth pan speed
      worldCopyJump: false,
      maxBoundsViscosity: 1.0,  // Prevent dragging outside bounds
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add map click listener
    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Add bounds change listener
    if (onBoundsChange) {
      map.on('moveend', () => {
        const bounds = leafletMapRef.current?.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          onBoundsChange({
            ne: { lat: ne.lat, lng: ne.lng },
            sw: { lat: sw.lat, lng: sw.lng },
          });
        }
      });
    }

    leafletMapRef.current = map;
    setIsLoaded(true);

    if (process.env.NODE_ENV === 'development') {
      console.log('[LeafletMap] Leaflet map loaded successfully');
    }

    // Cleanup function
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      markersRef.current.clear();
      if (markerClusterGroupRef.current) {
        markerClusterGroupRef.current.clearLayers();
        markerClusterGroupRef.current = null;
      }
    };
  }, []);

  // Helper function to create custom marker icon
  const createMarkerIcon = (place: Place, isSelected: boolean = false, isHovered: boolean = false): L.DivIcon => {
    const typeColor = getTypeColor(place.type);
    const baseSize = isMobile ? 12 : 8;
    const size = isSelected ? baseSize * 1.75 : (isHovered ? baseSize * 1.3 : baseSize);

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-pin ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}" style="
          width: ${size * 2}px;
          height: ${size * 2}px;
          background-color: ${isSelected ? '#2563eb' : typeColor};
          border: ${isSelected ? '4px' : '3px'} solid ${isSelected ? '#1e40af' : '#ffffff'};
          border-radius: 50%;
          opacity: ${isSelected ? '1' : '0.9'};
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          box-shadow: ${isSelected ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)'};
          cursor: pointer;
          transform: ${isHovered ? 'scale(1.1)' : 'scale(1)'};
        "></div>
      `,
      iconSize: [size * 2, size * 2],
      iconAnchor: [size, size],
    });
  };

  // Helper function to create popup content
  const createPopupContent = (place: Place): string => {
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
    };

    return `
      <div style="padding: 12px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          ${place.name}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="
            background: ${getTypeColor(place.type)};
            color: white;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
          ">
            ${typeLabels[place.type] || place.type}
          </span>
        </div>
        ${place.googleRating ? `
          <div style="margin-bottom: 6px; font-size: 14px; color: #374151;">
            ⭐ <strong>${place.googleRating.toFixed(1)}</strong>
            <span style="color: #6b7280; font-size: 12px;">
              (${place.googleRatingsTotal?.toLocaleString() || 0} 則評論)
            </span>
          </div>
        ` : ''}
        ${place.address ? `
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px; line-height: 1.4;">
            📍 ${place.address}
          </div>
        ` : ''}
        ${place.privacyTags && place.privacyTags.length > 0 ? `
          <div style="margin-top: 8px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 4px;">
            ${place.privacyTags.slice(0, 4).map(tag =>
              `<span style="
                background: #f3f4f6;
                color: #374151;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
              ">
                ${privacyTagLabels[tag] || tag}
              </span>`
            ).join('')}
          </div>
        ` : ''}
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px;">
          <a
            href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId || ''}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              flex: 1;
              text-align: center;
              padding: 8px 16px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#1e40af'"
            onmouseout="this.style.background='#2563eb'"
            title="在 Google 地圖中查看詳情"
          >
            📍 查看詳情
          </a>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              padding: 8px 12px;
              background: #f3f4f6;
              color: #374151;
              text-decoration: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#e5e7eb'"
            onmouseout="this.style.background='#f3f4f6'"
            title="導航至此地點"
          >
            🗺️ 導航
          </a>
        </div>
      </div>
    `;
  };

  // Update markers when places change
  useEffect(() => {
    if (!isLoaded || !leafletMapRef.current) return;

    // Clear existing markers and cluster group
    if (markerClusterGroupRef.current) {
      leafletMapRef.current.removeLayer(markerClusterGroupRef.current);
      markerClusterGroupRef.current.clearLayers();
    }
    markersRef.current.clear();

    // If no places, reset map to default view (NTU Main Campus)
    if (places.length === 0) {
      leafletMapRef.current.setView([25.0174, 121.5393], 13);
      return;
    }

    // Create marker cluster group with custom styling
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50, // Smaller radius for tighter clustering
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 100) size = 'large';
        else if (count >= 10) size = 'medium';

        return L.divIcon({
          html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40),
        });
      }
    });

    // Add new markers with coordinate validation
    let successCount = 0;
    let skipCount = 0;

    // Define Taiwan bounds for validation
    const TAIWAN_BOUNDS = {
      minLat: 21.5, maxLat: 26.0,
      minLng: 118.0, maxLng: 122.5
    };

    places.forEach((place) => {
      // Validate coordinates
      const lat = Number(place.latitude);
      const lng = Number(place.longitude);

      // Check if coordinates are valid numbers
      if (isNaN(lat) || isNaN(lng)) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[LeafletMap] Invalid coordinates for ${place.name}:`, { latitude: place.latitude, longitude: place.longitude });
        }
        skipCount++;
        return;
      }

      // Check if coordinates are within valid range
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[LeafletMap] Coordinates out of range for ${place.name}:`, { lat, lng });
        }
        skipCount++;
        return;
      }

      // Optional: Filter places outside Taiwan bounds
      if (lat < TAIWAN_BOUNDS.minLat || lat > TAIWAN_BOUNDS.maxLat ||
          lng < TAIWAN_BOUNDS.minLng || lng > TAIWAN_BOUNDS.maxLng) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[LeafletMap] Place outside Taiwan bounds: ${place.name} (${lat}, ${lng})`);
        }
      }

      const isSelected = place.id === selectedPlaceId;

      try {
        const marker = L.marker([lat, lng], {
          icon: createMarkerIcon(place, isSelected),
          title: place.name,
        });

        // Add popup
        marker.bindPopup(createPopupContent(place), {
          maxWidth: 300,
          className: 'custom-popup',
        });

        // Add click listener
        if (onMarkerClick) {
          marker.on('click', () => {
            onMarkerClick(place);
          });
        }

        // Add hover effect (Google Maps-like)
        marker.on('mouseover', function() {
          if (place.id !== selectedPlaceId) {
            this.setIcon(createMarkerIcon(place, false, true));
          }
        });

        marker.on('mouseout', function() {
          if (place.id !== selectedPlaceId) {
            this.setIcon(createMarkerIcon(place, false, false));
          }
        });

        // Store marker reference
        markersRef.current.set(place.id, marker);
        markerClusterGroup.addLayer(marker);
        successCount++;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[LeafletMap] Failed to create marker for ${place.name}:`, error);
        }
        skipCount++;
      }
    });

    // Add cluster group to map
    markerClusterGroupRef.current = markerClusterGroup;
    leafletMapRef.current.addLayer(markerClusterGroup);

    // Log summary
    console.log(`[LeafletMap] Marker creation complete:`, {
      total: places.length,
      created: successCount,
      skipped: skipCount,
      markerMapSize: markersRef.current.size,
      clusterGroupHasLayers: markerClusterGroupRef.current ? markerClusterGroupRef.current.getLayers().length : 0
    });

    // Auto-fit bounds to show all markers (only on initial load)
    if (successCount > 0 && !hasSetInitialBoundsRef.current) {
      const SHUANGBEI_BOUNDS = {
        minLat: 24.6, maxLat: 25.3,
        minLng: 121.3, maxLng: 121.8
      };

      const bounds = L.latLngBounds([]);
      let validPlaceCount = 0;

      places.forEach((place) => {
        const lat = Number(place.latitude);
        const lng = Number(place.longitude);

        if (!isNaN(lat) && !isNaN(lng) &&
            lat >= SHUANGBEI_BOUNDS.minLat && lat <= SHUANGBEI_BOUNDS.maxLat &&
            lng >= SHUANGBEI_BOUNDS.minLng && lng <= SHUANGBEI_BOUNDS.maxLng) {
          bounds.extend([lat, lng]);
          validPlaceCount++;
        }
      });

      if (validPlaceCount > 0 && bounds.isValid()) {
        leafletMapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: validPlaceCount === 1 ? 15 : 16,
        });
        hasSetInitialBoundsRef.current = true; // Mark as set
      } else {
        leafletMapRef.current.setView([25.0330, 121.5654], 11);
        hasSetInitialBoundsRef.current = true; // Mark as set
      }
    }
  }, [places, isLoaded, onMarkerClick, isMobile, selectedPlaceId]);

  // Update selected marker styling
  useEffect(() => {
    if (!isLoaded || !leafletMapRef.current) return;

    markersRef.current.forEach((marker, id) => {
      const place = places.find((p) => p.id === id);
      const isSelected = id === selectedPlaceId;

      if (place) {
        marker.setIcon(createMarkerIcon(place, isSelected));

        // Pan to selected marker if not visible
        if (isSelected && leafletMapRef.current) {
          const markerLatLng = marker.getLatLng();
          const bounds = leafletMapRef.current.getBounds();

          if (!bounds.contains(markerLatLng)) {
            leafletMapRef.current.panTo(markerLatLng);
          }

          // Open popup for selected marker
          marker.openPopup();
        }
      }
    });
  }, [selectedPlaceId, isLoaded, places, isMobile]);

  // Focus on place when focusedPlaceId changes
  useEffect(() => {
    if (!focusedPlaceId || !leafletMapRef.current || !isLoaded) return;

    const marker = markersRef.current.get(focusedPlaceId);
    if (marker) {
      const markerLatLng = marker.getLatLng();
      const bounds = leafletMapRef.current.getBounds();

      if (!bounds.contains(markerLatLng)) {
        leafletMapRef.current.panTo(markerLatLng);
      }
    }
  }, [focusedPlaceId, isLoaded]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full relative">
        {/* Loading Indicator */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-50">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-sm font-medium text-gray-700">正在載入地圖...</p>
              <p className="text-xs text-gray-500 mt-2">使用 OpenStreetMap 免費圖資</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
        }

        .custom-marker .marker-pin {
          will-change: transform;
        }

        .custom-marker .marker-pin.hovered {
          z-index: 1000 !important;
        }

        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .custom-popup .leaflet-popup-content {
          margin: 0;
        }

        .custom-popup .leaflet-popup-tip {
          background: white;
        }

        /* Custom Cluster Icons */
        .custom-cluster-icon {
          background: transparent;
          border: none;
        }

        .cluster-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-center: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .cluster-small {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-size: 13px;
        }

        .cluster-medium {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          font-size: 15px;
        }

        .cluster-large {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          font-size: 16px;
          font-weight: 900;
        }

        .custom-cluster-icon:hover .cluster-icon {
          transform: scale(1.1);
        }

        /* Smooth zoom controls (Google Maps-like) */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }

        .leaflet-control-zoom a {
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          font-size: 20px !important;
          border: none !important;
          background: white !important;
          color: #333 !important;
          transition: all 0.2s ease !important;
        }

        .leaflet-control-zoom a:hover {
          background: #f5f5f5 !important;
          color: #000 !important;
        }

        .leaflet-control-zoom a:first-child {
          border-radius: 8px 8px 0 0 !important;
        }

        .leaflet-control-zoom a:last-child {
          border-radius: 0 0 8px 8px !important;
          border-top: 1px solid #e5e5e5 !important;
        }

        /* Smooth tile loading */
        .leaflet-tile-container {
          transition: opacity 0.2s ease-in-out;
        }

        /* Attribution styling */
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(8px);
          border-radius: 4px 0 0 0 !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
        }
      `}</style>
    </>
  );
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    hotel: "#059669", // Green for hotels
    motel: "#db2777", // Pink for motels
    short_stay: "#f97316", // Orange for short stays
  };
  return colors[type] || "#6b7280";
}
