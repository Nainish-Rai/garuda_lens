"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Map as LeafletMap, LatLngBounds } from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  MapPin,
  TrendingUp,
  Droplets,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  CITY_CONFIGS,
  type EnhancedQueryResult,
  type AnalysisJobStatus,
} from "@/lib/types";
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

interface MapInterfaceProps {
  queryResult?: EnhancedQueryResult | null;
  className?: string;
  onAnalysisStart?: (jobId: string) => void;
  onAnalysisComplete?: (result: EnhancedQueryResult) => void;
}

export default function MapInterface({
  queryResult: externalQueryResult,
  className,
  onAnalysisStart,
  onAnalysisComplete,
}: MapInterfaceProps) {
  const mapRef = useRef<LeafletMap>(null);
  const [currentCity, setCurrentCity] = useState<string>("dynamic");
  const [viewState, setViewState] = useState<ViewState>(() => {
    // Default to a global view that can be adjusted dynamically
    return {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
    };
  });
  const [mapBounds, setMapBounds] = useState<LatLngBounds | undefined>();

  const [timeRange, setTimeRange] = useState([2015, 2024]);
  const [activeLayers, setActiveLayers] = useState({
    propertyHeatmap: true,
    climateRisk: true,
    boundaries: true,
  });

  // NEW: Task 4 - Analysis job handling
  const [currentJob, setCurrentJob] = useState<AnalysisJobStatus | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showSatelliteView, setShowSatelliteView] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // NEW: Enhanced query handler for async analysis
  const handleQuery = async (query: string) => {
    try {
      setIsQuerying(true);
      setAnalysisError(null);
      setCurrentJob(null);

      // Call the new analysis endpoint
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.status}`);
      }

      const jobInfo = await response.json();

      // Start polling for job status
      setCurrentJob({
        jobId: jobInfo.jobId,
        status: "PENDING",
        progress: "Starting analysis...",
        elapsedTime: 0,
      });

      onAnalysisStart?.(jobInfo.jobId);

      // Start polling
      startJobPolling(jobInfo.jobId, jobInfo.pollingUrl);
    } catch (error) {
      console.error("Query error:", error);
      setAnalysisError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setIsQuerying(false);
    }
  };

  // NEW: Job polling functionality
  const startJobPolling = (jobId: string, pollingUrl: string) => {
    const pollInterval = 2000; // Poll every 2 seconds

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(pollingUrl);
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const jobStatus: AnalysisJobStatus = await response.json();
        setCurrentJob(jobStatus);

        if (jobStatus.status === "COMPLETE") {
          // Analysis completed successfully
          setIsQuerying(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Process the results
          if (jobStatus.data) {
            const enhancedResult = transformAnalysisResult(jobStatus.data);
            onAnalysisComplete?.(enhancedResult);

            // Show satellite view if satellite data is available
            if (enhancedResult.satelliteData) {
              setShowSatelliteView(true);
            }
          }
        } else if (jobStatus.status === "FAILED") {
          // Analysis failed
          setIsQuerying(false);
          setAnalysisError(jobStatus.error || "Analysis failed");
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
        // Continue polling for PENDING/PROCESSING status
      } catch (error) {
        console.error("Polling error:", error);
        setAnalysisError("Failed to check analysis status");
        setIsQuerying(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, pollInterval);
  };

  // NEW: Transform analysis results to enhanced query result format
  const transformAnalysisResult = (analysisData: any): EnhancedQueryResult => {
    // Handle different analysis types
    const analysisType =
      analysisData.type?.replace("_analysis", "") || "gentrification";

    let polygons: any[] = [];
    let satelliteData = null;
    let statistics = null;

    if (analysisData.data?.changePolygons) {
      // Transform GeoJSON features to MapPolygon format
      polygons = analysisData.data.changePolygons.features.map(
        (feature: any, index: number) => ({
          id: `change_${index}`,
          coordinates: feature.geometry.coordinates,
          properties: {
            name: feature.properties?.name || `Change Area ${index + 1}`,
            priceChange: feature.properties?.confidence
              ? Math.round(feature.properties.confidence * 100)
              : 0,
            floodRisk: feature.properties?.area
              ? Math.min(100, feature.properties.area / 1000)
              : 0,
            area: feature.properties?.changeType || "detected_change",
            population: feature.properties?.estimatedPopulation,
            avgPropertyValue: feature.properties?.avgPropertyValue,
          },
        })
      );

      // Extract satellite imagery data
      if (analysisData.data.images) {
        satelliteData = {
          beforeImage: analysisData.data.images.beforeImage,
          afterImage: analysisData.data.images.afterImage,
          overlayImage: analysisData.data.images.overlayImage,
          maskImage: analysisData.data.images.maskImage,
          analysisMetadata: analysisData.data.metadata,
        };
      }

      // Extract statistics based on analysis type
      if (analysisType === "deforestation" && analysisData.data.forestLoss) {
        statistics = {
          deforestedArea: analysisData.data.forestLoss.deforestedArea,
          forestLossPercentage:
            analysisData.data.forestLoss.forestLossPercentage,
          originalForestArea: analysisData.data.forestStats.originalForestArea,
          remainingForestArea:
            analysisData.data.forestStats.remainingForestArea,
          treeCoverLoss: analysisData.data.forestStats.treeCoverLoss,
          averageTreeDensityChange:
            analysisData.data.forestStats.averageTreeDensityChange,
        };
      } else if (
        analysisType === "urbanization" &&
        analysisData.data.urbanGrowth
      ) {
        statistics = {
          newUrbanArea: analysisData.data.urbanGrowth.newUrbanArea,
          urbanGrowthPercentage:
            analysisData.data.urbanGrowth.urbanGrowthPercentage,
          populationImpact: analysisData.data.populationImpact || {
            estimatedPopulation: 0,
            populationDensity: 0,
            confidence: 0.5,
          },
          urbanGrowthMetrics: analysisData.data.urbanGrowthMetrics || {
            developmentRate: 0,
            infrastructureExpansion: 0,
            averageUrbanDensityChange: 0,
          },
        };
      } else if (analysisData.data.statistics) {
        statistics = analysisData.data.statistics;
      }
    } else if (analysisData.data?.polygons) {
      // Handle existing gentrification analysis format
      polygons = analysisData.data.polygons;
    }

    return {
      polygons,
      summary: {
        totalAreas: polygons.length,
        avgPriceIncrease:
          polygons.reduce(
            (sum, p) => sum + (p.properties?.priceChange || 0),
            0
          ) / Math.max(1, polygons.length),
        avgFloodRiskIncrease:
          polygons.reduce((sum, p) => sum + (p.properties?.floodRisk || 0), 0) /
          Math.max(1, polygons.length),
        timeRange: analysisData.intent?.dateRange?.join(" to ") || "2020-2024",
        totalPopulation: polygons.reduce(
          (sum, p) => sum + (p.properties?.population || 0),
          0
        ),
      },
      insights: analysisData.data?.insights || [],
      city: analysisData.intent?.location || currentCity,
      dataSource: {
        propertyData: "Geospatial Analysis",
        riskData: "Satellite Imagery",
        boundaryData: "Change Detection",
      },
      meta: {
        queryProcessed: analysisData.intent?.extractedParams?.timeFrame,
        resultsCount: polygons.length,
        processingTime: `${Math.round((currentJob?.elapsedTime || 0) / 1000)}s`,
        aiProcessed: true,
        geminiUsed: true,
      },
      satelliteData,
      analysisType: analysisType as any,
      statistics,
    };
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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
        // Skip loading base map data since cities are specified dynamically
        // Users will get data from their chat queries instead
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

  // NEW: Progress indicator for analysis
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
      return "text-blue-500";
    };

    const getStatusIcon = () => {
      if (analysisError)
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      if (currentJob?.status === "COMPLETE")
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    };

    return (
      <Card className="absolute top-20 left-4 right-4 z-10 bg-card/90 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="flex-1">
              <div className={cn("text-sm font-medium", getStatusColor())}>
                {analysisError
                  ? "Analysis Failed"
                  : currentJob?.progress || "Starting analysis..."}
              </div>
              {analysisError && (
                <div className="text-xs text-red-400 mt-1">{analysisError}</div>
              )}
              {currentJob?.elapsedTime && (
                <div className="text-xs text-muted-foreground mt-1">
                  Elapsed: {Math.round(currentJob.elapsedTime / 1000)}s
                </div>
              )}
            </div>
          </div>
          {!analysisError && (
            <Progress value={getProgressValue()} className="mt-3 h-2" />
          )}
          {analysisError && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setAnalysisError(null);
                setCurrentJob(null);
              }}
            >
              Dismiss
            </Button>
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
      {/* Analysis Progress Indicator */}
      {renderAnalysisProgress()}

      {/* NEW: Satellite View Toggle */}
      {displayQueryResult?.satelliteData && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant={showSatelliteView ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSatelliteView(!showSatelliteView)}
            className="bg-card/70 backdrop-blur-md"
          >
            {showSatelliteView ? "Hide Satellite" : "Show Satellite"}
          </Button>
        </div>
      )}

      {/* NEW: Satellite Image Viewer */}
      {showSatelliteView && displayQueryResult?.satelliteData && (
        <div className="absolute top-16 right-4 z-10 w-96 max-h-[80vh] overflow-y-auto">
          <SatelliteImageViewer
            satelliteData={displayQueryResult.satelliteData}
            className="bg-card/90 backdrop-blur-md"
          />
        </div>
      )}

      {/* NEW: Statistics Panel */}
      {displayQueryResult?.statistics && displayQueryResult?.analysisType && (
        <div className="absolute bottom-4 right-4 z-10 w-80 max-h-[60vh] overflow-y-auto">
          <ChangeDetectionStatsComponent
            statistics={displayQueryResult.statistics}
            analysisType={displayQueryResult.analysisType}
            className="bg-card/90 backdrop-blur-md"
          />
        </div>
      )}

      {/* Layer Controls Only - No City Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-card/70 backdrop-blur-md shadow-md border border-border/30">
          <CardContent className="p-2">
            {/* Removed City Selector - Users specify cities via chat */}

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
