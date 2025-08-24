"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Map as LeafletMap, LatLngBounds } from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  TrendingUp,
  Droplets,
  Loader2,
  AlertCircle,
  CheckCircle,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { type EnhancedQueryResult, type AnalysisJobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import SatelliteImageViewer from "./SatelliteImageViewer";
import ChangeDetectionStatsComponent from "./ChangeDetectionStats";
import "leaflet/dist/leaflet.css";

interface ViewState {
  center: [number, number]; // [lat, lng]
  zoom: number;
}

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

interface NDVIStatistics {
  before: {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
  };
  after: {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
  };
  change: {
    mean_change: number;
    std_change: number;
    significant_change_pixels: number;
  };
}

interface NDVIChangeStatistics {
  total_valid_pixels: number;
  vegetation_gain: { count: number; percentage: number };
  vegetation_loss: { count: number; percentage: number };
  urbanization: { count: number; percentage: number };
  urban_loss: { count: number; percentage: number };
  water_gain: { count: number; percentage: number };
  water_loss: { count: number; percentage: number };
}

interface NDVIAnalysisResult {
  success: boolean;
  location: string;
  coordinates: { latitude: number; longitude: number };
  timeline_start: string;
  timeline_end: string;
  chosen_dates: Array<{ date: string; cloud: string }>;
  ndvi_analysis: {
    ndvi_statistics: NDVIStatistics;
    change_statistics: NDVIChangeStatistics;
    analysis_focus: string;
    detected_intents: {
      vegetation_focus: boolean;
      urban_focus: boolean;
      water_focus: boolean;
      general: boolean;
    };
  };
  change_analysis: {
    total_change_percentage: number;
    dominant_change: string;
    vegetation_change_net: number;
    urban_change_net: number;
    water_change_net: number;
    change_intensity: string;
  };
  recommendations: string[];
  visualizations: Record<string, unknown>;
  socioeconomic_correlation: Record<string, unknown> | null;
}

interface MapInterfaceProps {
  queryResult?: EnhancedQueryResult | null;
  className?: string;
  onAnalysisComplete?: (result: EnhancedQueryResult) => void;
}

interface MapFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    name?: string;
    priceChange?: number;
    floodRisk?: number;
    area?: string;
    population?: number;
    avgPropertyValue?: string;
  };
}

interface AnalysisData {
  type: string;
  data?: {
    results?: Array<{
      ward?: string;
      priceChangePercent?: number;
      currentRiskLevel?: number;
      population?: number;
      avgPropertyValue?: string;
    }>;
    summary?: {
      totalAreas: number;
      avgPriceIncrease: number;
      avgFloodRiskIncrease: number;
      timeRange: string;
      totalPopulation?: number;
    };
    insights?: string[];
    city?: string;
    sources?: {
      propertyData: string;
      riskData: string;
      boundaryData: string;
    };
    meta?: {
      queryProcessed: string;
      resultsCount: number;
      processingTime: string;
      aiProcessed: boolean;
      geminiUsed: boolean;
    };
  };
}

export default function MapInterface({
  queryResult: externalQueryResult,
  className,
  onAnalysisComplete,
}: MapInterfaceProps) {
  const mapRef = useRef<LeafletMap>(null);
  const [viewState, setViewState] = useState<ViewState>(() => {
    return {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
    };
  });
  const [mapBounds, setMapBounds] = useState<LatLngBounds | undefined>();

  const [activeLayers, setActiveLayers] = useState({
    propertyHeatmap: true,
    climateRisk: true,
    boundaries: true,
  });

  const [currentJob, setCurrentJob] = useState<AnalysisJobStatus | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSatelliteView] = useState(false);

  const [ndviData, setNdviData] = useState<NDVIAnalysisResult | null>(null);
  const [showNdviCharts, setShowNdviCharts] = useState(false);

  const renderNDVICharts = () => {
    if (!ndviData || !showNdviCharts) return null;

    const { ndvi_analysis, change_analysis } = ndviData;

    const changeData = [
      {
        category: "Vegetation Gain",
        percentage: ndvi_analysis.change_statistics.vegetation_gain.percentage,
        count: ndvi_analysis.change_statistics.vegetation_gain.count,
        color: "#10b981",
      },
      {
        category: "Vegetation Loss",
        percentage: ndvi_analysis.change_statistics.vegetation_loss.percentage,
        count: ndvi_analysis.change_statistics.vegetation_loss.count,
        color: "#ef4444",
      },
      {
        category: "Urbanization",
        percentage: ndvi_analysis.change_statistics.urbanization.percentage,
        count: ndvi_analysis.change_statistics.urbanization.count,
        color: "#f59e0b",
      },
      {
        category: "Urban Loss",
        percentage: ndvi_analysis.change_statistics.urban_loss.percentage,
        count: ndvi_analysis.change_statistics.urban_loss.count,
        color: "#8b5cf6",
      },
      {
        category: "Water Gain",
        percentage: ndvi_analysis.change_statistics.water_gain.percentage,
        count: ndvi_analysis.change_statistics.water_gain.count,
        color: "#06b6d4",
      },
      {
        category: "Water Loss",
        percentage: ndvi_analysis.change_statistics.water_loss.percentage,
        count: ndvi_analysis.change_statistics.water_loss.count,
        color: "#dc2626",
      },
    ];

    const ndviComparisonData = [
      {
        metric: "Mean NDVI",
        before: ndvi_analysis.ndvi_statistics.before.mean,
        after: ndvi_analysis.ndvi_statistics.after.mean,
        change: ndvi_analysis.ndvi_statistics.change.mean_change,
      },
      {
        metric: "Median NDVI",
        before: ndvi_analysis.ndvi_statistics.before.median,
        after: ndvi_analysis.ndvi_statistics.after.median,
        change:
          ndvi_analysis.ndvi_statistics.after.median -
          ndvi_analysis.ndvi_statistics.before.median,
      },
      {
        metric: "Max NDVI",
        before: ndvi_analysis.ndvi_statistics.before.max,
        after: ndvi_analysis.ndvi_statistics.after.max,
        change:
          ndvi_analysis.ndvi_statistics.after.max -
          ndvi_analysis.ndvi_statistics.before.max,
      },
    ];

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Land Use Change Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={changeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="category"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                  formatter={(value) => [
                    `${Number(value).toFixed(2)}%`,
                    "Percentage",
                  ]}
                  labelFormatter={(label) => `Change Type: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  fill="url(#colorGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient
                    id="colorGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>NDVI Values Comparison</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={ndviComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                  formatter={(value, name) => [
                    Number(value).toFixed(3),
                    name === "before"
                      ? "Before"
                      : name === "after"
                      ? "After"
                      : "Change",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="before"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="after"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {change_analysis.vegetation_change_net > 0 ? "+" : ""}
                  {change_analysis.vegetation_change_net.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Net Vegetation Change
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {change_analysis.total_change_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Change
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <span>AI Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ndviData.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded bg-muted/30"
                >
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <div className="text-sm">{rec}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Effect to handle NDVI data from external query results
  useEffect(() => {
    if (
      externalQueryResult?.statistics &&
      "ndviData" in externalQueryResult.statistics
    ) {
      const ndviResult = (externalQueryResult.statistics as any).ndviData;
      if (ndviResult) {
        setNdviData(ndviResult);
        setShowNdviCharts(true);
      }
    } else {
      setShowNdviCharts(false);
    }
  }, [externalQueryResult]);

  // Base map data loading and processing
  const [baseMapData, setBaseMapData] = useState<MapFeature[]>([]);

  useEffect(() => {
    const loadBaseMapData = async () => {
      try {
        setBaseMapData([]);
      } catch (error) {
        console.error("Failed to load base map data:", error);
        setBaseMapData([]);
      }
    };

    loadBaseMapData();
  }, []);

  // Use external query result only
  const displayQueryResult = externalQueryResult;

  // Auto-fit map bounds when external query result changes
  useEffect(() => {
    if (
      displayQueryResult?.polygons &&
      displayQueryResult.polygons.length > 0
    ) {
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

      if (minLng !== Infinity) {
        const bounds = new LatLngBounds([minLat, minLng], [maxLat, maxLng]);
        setMapBounds(bounds);

        setViewState({
          center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
          zoom: 10,
        });
      }
    }
  }, [displayQueryResult]);

  // Transform analysis result
  const transformAnalysisResult = (data: AnalysisData): EnhancedQueryResult => {
    if (data.type === "gentrification_analysis") {
      return {
        polygons:
          data.data?.results?.map((result, index) => ({
            id: `result_${index}`,
            coordinates: [
              [
                [73.8567 + index * 0.01, 18.5204 + index * 0.01],
                [73.8667 + index * 0.01, 18.5204 + index * 0.01],
                [73.8667 + index * 0.01, 18.5304 + index * 0.01],
                [73.8567 + index * 0.01, 18.5304 + index * 0.01],
                [73.8567 + index * 0.01, 18.5204 + index * 0.01],
              ],
            ],
            properties: {
              name: result.ward || `Area ${index + 1}`,
              priceChange: result.priceChangePercent || 0,
              floodRisk: result.currentRiskLevel || 0,
              area: result.ward || "Unknown",
              population: result.population || 0,
              avgPropertyValue: result.avgPropertyValue || "N/A",
            },
          })) || [],
        summary: data.data?.summary || {
          totalAreas: 0,
          avgPriceIncrease: 0,
          avgFloodRiskIncrease: 0,
          timeRange: "Unknown",
        },
        insights: data.data?.insights || [],
        city: data.data?.city || "Unknown",
        dataSource: data.data?.sources || {
          propertyData: "Unknown",
          riskData: "Unknown",
          boundaryData: "Unknown",
        },
        meta: data.data?.meta || {
          queryProcessed: "Unknown",
          resultsCount: 0,
          processingTime: "0s",
          aiProcessed: false,
          geminiUsed: false,
        },
      };
    }

    return {
      polygons: [],
      summary: {
        totalAreas: 0,
        avgPriceIncrease: 0,
        avgFloodRiskIncrease: 0,
        timeRange: "Unknown",
      },
      insights: ["Analysis completed but no data available"],
      city: "Unknown",
      dataSource: {
        propertyData: "Unknown",
        riskData: "Unknown",
        boundaryData: "Unknown",
      },
      meta: {
        queryProcessed: "Unknown",
        resultsCount: 0,
        processingTime: "0s",
        aiProcessed: false,
        geminiUsed: false,
      },
    };
  };

  // Create GeoJSON from base map data
  const mapData =
    baseMapData.length > 0
      ? {
          type: "FeatureCollection" as const,
          features: baseMapData,
        }
      : displayQueryResult?.polygons
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
      : null;

  // Style functions for map layers
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

    if (isHighlighted) {
      borderColor = "#ff4444";
      borderWidth = 4;
      fillOpacity = 0.9;
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

  // Progress indicator for analysis
  const renderAnalysisProgress = () => {
    if (!isQuerying && !currentJob) return null;

    const getProgressValue = () => {
      if (!currentJob) return 10;
      switch (currentJob.status) {
        case "PENDING":
          return 25;
        case "PROCESSING":
          return 60;
        case "COMPLETE":
          return 100;
        case "FAILED":
          return 0;
        default:
          return 10;
      }
    };

    const getStatusColor = () => {
      if (analysisError) return "text-red-500";
      if (currentJob?.status === "COMPLETE") return "text-green-500";
      if (currentJob?.status === "PROCESSING") return "text-blue-500";
      return "text-yellow-500";
    };

    const getStatusIcon = () => {
      if (analysisError)
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      if (currentJob?.status === "COMPLETE")
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (currentJob?.status === "PROCESSING")
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    };

    return (
      <Card className="bg-card/90 backdrop-blur-md">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={cn("text-sm font-medium", getStatusColor())}>
              {analysisError
                ? "Analysis Failed"
                : currentJob?.status || "Starting..."}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {analysisError || currentJob?.progress || "Initializing..."}
              </span>
              <span>
                {currentJob?.elapsedTime
                  ? `${Math.round(currentJob.elapsedTime / 1000)}s`
                  : ""}
              </span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>
          {analysisError && (
            <div className="text-xs text-red-500 mt-2">{analysisError}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className={cn(
        "relative w-full h-screen overflow-hidden bg-background",
        className
      )}
    >
      {/* NDVI Charts Overlay - Show when NDVI data is available */}
      {showNdviCharts && (
        <div className="absolute top-4 right-4 z-20 w-96 max-h-[90vh] overflow-y-auto">
          {renderNDVICharts()}
        </div>
      )}

      {/* Analysis Progress */}
      {(isQuerying || currentJob) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-80">
          {renderAnalysisProgress()}
        </div>
      )}

      {/* Layer Controls */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-card/70 backdrop-blur-md shadow-md border border-border/30">
          <CardContent className="p-2">
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

      {/* Satellite Image Viewer */}
      {showSatelliteView && displayQueryResult?.satelliteData && (
        <div className="absolute top-16 right-4 z-10 w-96 max-h-[80vh] overflow-y-auto">
          <SatelliteImageViewer
            satelliteData={displayQueryResult.satelliteData}
            className="bg-card/90 backdrop-blur-md"
          />
        </div>
      )}

      {/* Statistics Panel */}
      {displayQueryResult?.statistics &&
        displayQueryResult?.analysisType &&
        !showNdviCharts && (
          <div className="absolute bottom-4 right-4 z-10 w-80 max-h-[60vh] overflow-y-auto">
            <ChangeDetectionStatsComponent
              statistics={displayQueryResult.statistics}
              analysisType={
                displayQueryResult.analysisType as
                  | "urbanization"
                  | "deforestation"
                  | "change_detection"
              }
              className="bg-card/90 backdrop-blur-md"
            />
          </div>
        )}
    </div>
  );
}
