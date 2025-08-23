"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Map as LeafletMap, LatLngBounds } from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, TrendingUp, Droplets } from "lucide-react";
import { CITY_CONFIGS, type EnhancedQueryResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

interface ViewState {
  center: [number, number]; // [lat, lng]
  zoom: number;
}

// Use the enhanced result type from types.ts
type QueryResult = EnhancedQueryResult;

// Component to handle map bounds fitting
function FitBounds({ bounds }: { bounds?: LatLngBounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
}

interface MapInterfaceProps {
  queryResult?: EnhancedQueryResult | null;
  className?: string;
}

export default function MapInterface({
  queryResult: externalQueryResult,
  className,
}: MapInterfaceProps) {
  const mapRef = useRef<LeafletMap>(null);
  const [currentCity, setCurrentCity] = useState<string>("pune");
  const [viewState, setViewState] = useState<ViewState>(() => {
    const cityConfig = CITY_CONFIGS[currentCity];
    return {
      center: cityConfig.center,
      zoom: cityConfig.zoom,
    };
  });
  const [mapBounds, setMapBounds] = useState<LatLngBounds | undefined>();

  const [timeRange, setTimeRange] = useState([2015, 2024]);
  const [activeLayers, setActiveLayers] = useState({
    propertyHeatmap: true,
    climateRisk: true,
    boundaries: true,
  });

  // Update view when city changes
  const handleCityChange = (newCity: string) => {
    if (CITY_CONFIGS[newCity]) {
      setCurrentCity(newCity);
      const cityConfig = CITY_CONFIGS[newCity];
      setViewState({
        center: cityConfig.center,
        zoom: cityConfig.zoom,
      });
      // Clear previous results when switching cities
    }
  };

  // State for base map data
  const [baseMapData, setBaseMapData] = useState<
    Array<{
      type: "Feature";
      geometry: {
        type: "Polygon";
        coordinates: number[][][];
      };
      properties: {
        name: string;
        priceChange: number;
        floodRisk: number;
        area: string;
        ward: string;
        city: string;
        population?: number;
        avgPropertyValue?: string;
      };
    }>
  >([]);

  // Load base map data when city changes
  useEffect(() => {
    const loadBaseMapData = async () => {
      try {
        // Fetch ward boundary data for the current city
        const response = await fetch(`/api/risk?city=${currentCity}`);
        if (response.ok) {
          const data = await response.json();

          // Convert ward data to map features
          const features =
            data.wards?.map(
              (ward: {
                ward: string;
                coordinates: [number, number];
                population?: number;
                avgPropertyValue?: string;
                currentRisk: { riskScore: number };
                riskTrend: { currentScore: number; baselineScore: number };
              }) => ({
                type: "Feature" as const,
                geometry: {
                  type: "Polygon" as const,
                  coordinates: [
                    // Generate approximate polygon from center coordinates
                    [
                      [ward.coordinates[1] - 0.01, ward.coordinates[0] - 0.01],
                      [ward.coordinates[1] + 0.01, ward.coordinates[0] - 0.01],
                      [ward.coordinates[1] + 0.01, ward.coordinates[0] + 0.01],
                      [ward.coordinates[1] - 0.01, ward.coordinates[0] + 0.01],
                      [ward.coordinates[1] - 0.01, ward.coordinates[0] - 0.01],
                    ],
                  ],
                },
                properties: {
                  name: ward.ward,
                  priceChange: Math.round(
                    ((ward.riskTrend.currentScore -
                      ward.riskTrend.baselineScore) /
                      ward.riskTrend.baselineScore) *
                      100
                  ),
                  floodRisk: Math.round(ward.currentRisk.riskScore * 100),
                  area: ward.ward.split(" ")[0],
                  ward: ward.ward,
                  city: data.city,
                  population: ward.population,
                  avgPropertyValue: ward.avgPropertyValue,
                },
              })
            ) || [];

          setBaseMapData(features);
        }
      } catch (error) {
        console.error("Failed to load base map data:", error);
        // Keep empty array if load fails
        setBaseMapData([]);
      }
    };

    loadBaseMapData();
  }, [currentCity]);

  // Use external query result only
  const displayQueryResult = externalQueryResult;

  // Auto-fit map bounds when external query result changes
  useEffect(() => {
    if (
      displayQueryResult?.polygons &&
      displayQueryResult.polygons.length > 0
    ) {
      // Calculate bounds from polygon coordinates
      let minLng = Infinity,
        minLat = Infinity,
        maxLng = -Infinity,
        maxLat = -Infinity;

      displayQueryResult.polygons.forEach((polygon) => {
        polygon.coordinates[0].forEach((coord) => {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      });

      const bounds = new LatLngBounds([minLat, minLng], [maxLat, maxLng]);
      setMapBounds(bounds);
    }
  }, [displayQueryResult]);

  // Generate map data from query results or use base map data
  const mapData = displayQueryResult
    ? {
        type: "FeatureCollection" as const,
        features: displayQueryResult.polygons.map((polygon) => ({
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: polygon.coordinates,
          },
          properties: polygon.properties,
        })),
      }
    : {
        type: "FeatureCollection" as const,
        features: baseMapData,
      };

  const handleTimeChange = useCallback((newTime: number[]) => {
    setTimeRange(newTime);
  }, []);

  // Style function for property heatmap with enhanced highlighting
  const getPropertyHeatmapStyle = (feature?: {
    properties?: { priceChange?: number; name?: string };
  }) => {
    const priceChange = feature?.properties?.priceChange || 0;
    const isHighlighted =
      displayQueryResult &&
      displayQueryResult.polygons.some(
        (polygon) => polygon.properties.name === feature?.properties?.name
      );

    let color = "#f7fbff";
    let borderColor = "#08519c";
    let borderWidth = 2;
    let fillOpacity = activeLayers.propertyHeatmap ? 0.7 : 0;

    if (priceChange >= 50) color = "#08519c";
    else if (priceChange >= 40) color = "#6baed6";
    else if (priceChange >= 30) color = "#c6dbef";
    else if (priceChange >= 20) color = "#deebf7";

    // Enhanced highlighting for search results
    if (isHighlighted) {
      borderColor = "#ff4444";
      borderWidth = 4;
      fillOpacity = 0.9;
      // Add a glow effect
      return {
        fillColor: color,
        fillOpacity: fillOpacity,
        color: borderColor,
        weight: borderWidth,
        opacity: 1,
        dashArray: "5, 5",
        className: "highlighted-area animate-pulse",
      };
    }

    return {
      fillColor: color,
      fillOpacity: fillOpacity,
      color: borderColor,
      weight: borderWidth,
      opacity: activeLayers.propertyHeatmap ? 0.8 : 0,
    };
  };

  // Style function for climate risk overlay with enhanced highlighting
  const getClimateRiskStyle = (feature?: {
    properties?: { floodRisk?: number; name?: string };
  }) => {
    const floodRisk = feature?.properties?.floodRisk || 0;
    const isHighlighted =
      displayQueryResult &&
      displayQueryResult.polygons.some(
        (polygon) => polygon.properties.name === feature?.properties?.name
      );

    let color = "rgba(255, 255, 0, 0.1)";
    if (floodRisk >= 50) color = "rgba(255, 0, 0, 0.5)";
    else if (floodRisk >= 25) color = "rgba(255, 165, 0, 0.3)";

    // Enhanced highlighting for search results
    if (isHighlighted) {
      return {
        fillColor: "rgba(255, 68, 68, 0.6)",
        fillOpacity: activeLayers.climateRisk ? 0.6 : 0,
        color: "#ff4444",
        weight: 3,
        opacity: 0.8,
        dashArray: "10, 5",
      };
    }

    return {
      fillColor: color,
      fillOpacity: activeLayers.climateRisk ? 0.4 : 0,
      color: "transparent",
      weight: 0,
    };
  };

  // Popup content for features
  const onEachFeature = (
    feature: {
      properties?: {
        name?: string;
        priceChange?: number;
        floodRisk?: number;
        area?: string;
        population?: number;
        avgPropertyValue?: string;
      };
    },
    layer: { bindPopup: (content: string) => void }
  ) => {
    if (feature.properties) {
      const props = feature.properties;
      const popupContent = `
        <div>
          <h4><strong>${props.name}</strong></h4>
          <p>Price Change: <span style="color: green;">+${
            props.priceChange
          }%</span></p>
          <p>Flood Risk: <span style="color: orange;">${
            props.floodRisk
          }%</span></p>
          <p>Area: ${props.area}</p>
          ${
            props.population
              ? `<p>Population: ${(props.population / 1000).toFixed(0)}K</p>`
              : ""
          }
          ${
            props.avgPropertyValue
              ? `<p>Avg Property Value: ${props.avgPropertyValue}</p>`
              : ""
          }
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  return (
    <div
      className={cn(
        "relative w-full h-screen overflow-hidden bg-background",
        className
      )}
    >
      {/* City Selector & Layer Controls - Minimal */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-card/70 backdrop-blur-md shadow-md border border-border/30">
          <CardContent className="p-2">
            {/* City Selector */}
            <select
              value={currentCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full mb-2 px-2 py-1 text-xs border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring bg-background text-foreground"
            >
              {Object.entries(CITY_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>

            {/* Layer Toggles */}
            <div className="space-y-1">
              <label className="flex items-center space-x-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeLayers.propertyHeatmap}
                  onChange={(e) =>
                    setActiveLayers((prev) => ({
                      ...prev,
                      propertyHeatmap: e.target.checked,
                    }))
                  }
                  className="w-3 h-3 rounded border-border bg-background"
                />
                <TrendingUp className="h-3 w-3" />
                <span>Heatmap</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeLayers.climateRisk}
                  onChange={(e) =>
                    setActiveLayers((prev) => ({
                      ...prev,
                      climateRisk: e.target.checked,
                    }))
                  }
                  className="w-3 h-3 rounded border-border bg-background"
                />
                <Droplets className="h-3 w-3" />
                <span>Risk</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeLayers.boundaries}
                  onChange={(e) =>
                    setActiveLayers((prev) => ({
                      ...prev,
                      boundaries: e.target.checked,
                    }))
                  }
                  className="w-3 h-3 rounded border-border bg-background"
                />
                <MapPin className="h-3 w-3" />
                <span>Bounds</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* React Leaflet Map */}
      <MapContainer
        center={viewState.center}
        zoom={viewState.zoom}
        style={{ width: "100%", height: "100%" }}
        ref={mapRef}
        className="leaflet-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Handle map bounds fitting */}
        <FitBounds bounds={mapBounds} />

        {/* Property Heatmap Layer */}
        {activeLayers.propertyHeatmap && mapData && (
          <GeoJSON
            key={`property-heatmap-${JSON.stringify(activeLayers)}`}
            data={mapData}
            style={getPropertyHeatmapStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {/* Climate Risk Overlay */}
        {activeLayers.climateRisk && mapData && (
          <GeoJSON
            key={`climate-risk-${JSON.stringify(activeLayers)}`}
            data={mapData}
            style={getClimateRiskStyle}
          />
        )}
      </MapContainer>
    </div>
  );
}
