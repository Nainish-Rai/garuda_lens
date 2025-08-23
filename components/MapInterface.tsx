"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Map as LeafletMap, LatLngBounds } from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Calendar,
  MapPin,
  TrendingUp,
  Droplets,
  Brain,
  BarChart3,
} from "lucide-react";
import { QueryProcessor, MockDataGenerator } from "./QueryProcessor";
import { CITY_CONFIGS, type EnhancedQueryResult } from "@/lib/types";
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

export default function MapInterface() {
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

  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState([2015, 2024]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
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
      setQueryResult(null);
      setShowSidePanel(false);
      setQuery("");
    }
  };

  // Generate sample data based on current city
  const getSampleData = () => {
    if (currentCity === "pune") {
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [73.8027, 18.5024],
                [73.8127, 18.5024],
                [73.8127, 18.5124],
                [73.8027, 18.5124],
                [73.8027, 18.5024],
              ],
            ],
          },
          properties: {
            name: "Kothrud",
            priceChange: 38,
            floodRisk: 68,
            area: "Kothrud",
            ward: "Kothrud",
            city: "Pune",
          },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [73.802, 18.5529],
                [73.812, 18.5529],
                [73.812, 18.5629],
                [73.802, 18.5629],
                [73.802, 18.5529],
              ],
            ],
          },
          properties: {
            name: "Aundh",
            priceChange: 42,
            floodRisk: 61,
            area: "Aundh",
            ward: "Aundh",
            city: "Pune",
          },
        },
      ];
    } else {
      // Mumbai data
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [72.8077, 19.046],
                [72.8277, 19.046],
                [72.8277, 19.066],
                [72.8077, 19.066],
                [72.8077, 19.046],
              ],
            ],
          },
          properties: {
            name: "Bandra West",
            priceChange: 35,
            floodRisk: 45,
            area: "Bandra",
            ward: "Bandra West",
            city: "Mumbai",
          },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [72.8477, 19.076],
                [72.8677, 19.076],
                [72.8677, 19.096],
                [72.8477, 19.096],
                [72.8477, 19.076],
              ],
            ],
          },
          properties: {
            name: "Khar West",
            priceChange: 42,
            floodRisk: 38,
            area: "Khar",
            ward: "Khar West",
            city: "Mumbai",
          },
        },
      ];
    }
  };

  const samplePolygons = getSampleData();

  // Generate map data from query results or use sample data
  const mapData = queryResult
    ? {
        type: "FeatureCollection" as const,
        features: queryResult.polygons.map((polygon) => ({
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
        features: samplePolygons,
      };

  const handleQuery = useCallback(async () => {
    if (!query.trim()) return;

    setIsQuerying(true);
    setShowSidePanel(true);
    setProcessingStage("Parsing natural language query...");

    try {
      // Add current city context to query if not specified
      const enhancedQuery = query
        .toLowerCase()
        .includes(currentCity.toLowerCase())
        ? query
        : `${query} in ${currentCity}`;

      // Process the natural language query
      await new Promise((resolve) => setTimeout(resolve, 800));
      const processedQuery = QueryProcessor.processQuery(enhancedQuery);

      setProcessingStage("Searching property databases...");
      await new Promise((resolve) => setTimeout(resolve, 700));

      setProcessingStage("Analyzing climate risk data...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setProcessingStage("Generating insights...");
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Try to use the real API first, then fallback to mock data
      let result: QueryResult;
      try {
        result = await MockDataGenerator.queryNaturalLanguageAPI(enhancedQuery);
      } catch (error) {
        console.log("API failed, using mock data:", error);
        // Fallback to mock data with city context
        processedQuery.intent.city = currentCity;
        result = MockDataGenerator.generateResults(processedQuery.intent);
      }

      setQueryResult(result);
      setIsQuerying(false);
      setProcessingStage("");

      // Zoom to fit the results
      if (result.polygons.length > 0) {
        // Calculate bounds from polygon coordinates
        let minLng = Infinity,
          minLat = Infinity,
          maxLng = -Infinity,
          maxLat = -Infinity;

        result.polygons.forEach((polygon) => {
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
    } catch (error) {
      console.error("Query processing failed:", error);
      setIsQuerying(false);
      setProcessingStage("");
    }
  }, [query, currentCity]);

  const handleTimeChange = useCallback((newTime: number[]) => {
    setTimeRange(newTime);
  }, []);

  // Style function for property heatmap
  const getPropertyHeatmapStyle = (feature?: {
    properties?: { priceChange?: number };
  }) => {
    const priceChange = feature?.properties?.priceChange || 0;
    let color = "#f7fbff";
    if (priceChange >= 50) color = "#08519c";
    else if (priceChange >= 40) color = "#6baed6";
    else if (priceChange >= 30) color = "#c6dbef";
    else if (priceChange >= 20) color = "#deebf7";

    return {
      fillColor: color,
      fillOpacity: activeLayers.propertyHeatmap ? 0.7 : 0,
      color: "#08519c",
      weight: 2,
      opacity: activeLayers.propertyHeatmap ? 0.8 : 0,
    };
  };

  // Style function for climate risk overlay
  const getClimateRiskStyle = (feature?: {
    properties?: { floodRisk?: number };
  }) => {
    const floodRisk = feature?.properties?.floodRisk || 0;
    let color = "rgba(255, 255, 0, 0.1)";
    if (floodRisk >= 50) color = "rgba(255, 0, 0, 0.5)";
    else if (floodRisk >= 25) color = "rgba(255, 165, 0, 0.3)";

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
    <div className="relative w-full h-screen overflow-hidden">
      {/* Natural Language Query Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-0">
        <Card className="bg-white/80 backdrop-blur-sm rounded-full border-0">
          <CardContent className="">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={`Show me wards in ${currentCity} where property values rose >30% and flood risk increased since 2015...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-4 rounded-full h-12 text-sm"
                  onKeyPress={(e) => e.key === "Enter" && handleQuery()}
                />
              </div>
              <Button
                onClick={handleQuery}
                disabled={isQuerying || !query.trim()}
                className="h-12 px-6 rounded-full"
              >
                {isQuerying ? "Analyzing..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* City Selector & Layer Controls */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0">
          <CardContent className="p-3">
            {/* City Selector */}
            <div className="mb-3 pb-3 border-b border-gray-200">
              <label className="block text-sm font-medium mb-2">City</label>
              <select
                value={currentCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CITY_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeLayers.propertyHeatmap}
                  onChange={(e) =>
                    setActiveLayers((prev) => ({
                      ...prev,
                      propertyHeatmap: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <TrendingUp className="h-4 w-4" />
                <span>Property Heatmap</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeLayers.climateRisk}
                  onChange={(e) =>
                    setActiveLayers((prev) => ({
                      ...prev,
                      climateRisk: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <Droplets className="h-4 w-4" />
                <span>Climate Risk</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeLayers.boundaries}
                  onChange={(e) =>
                    setActiveLayers((prev) => ({
                      ...prev,
                      boundaries: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <MapPin className="h-4 w-4" />
                <span>Boundaries</span>
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

      {/* Time Warp Slider */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Time Range
                </span>
                <span>
                  {timeRange[0]} - {timeRange[1]}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500">2010</span>
                <input
                  type="range"
                  min="2010"
                  max="2024"
                  value={timeRange[0]}
                  onChange={(e) =>
                    handleTimeChange([parseInt(e.target.value), timeRange[1]])
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="2010"
                  max="2024"
                  value={timeRange[1]}
                  onChange={(e) =>
                    handleTimeChange([timeRange[0], parseInt(e.target.value)])
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-500">2024</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      {showSidePanel && (
        <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl z-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Query Results</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidePanel(false)}
              >
                ×
              </Button>
            </div>

            {isQuerying ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Brain className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-sm font-medium">AI Processing</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">{processingStage}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full animate-pulse"
                      style={{ width: "70%" }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Analyzing property data, climate patterns, and market
                  trends...
                </div>
              </div>
            ) : (
              queryResult && (
                <div className="space-y-6">
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Areas Found:
                        </span>
                        <span className="font-medium">
                          {queryResult.summary.totalAreas}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Avg Price Increase:
                        </span>
                        <span className="font-medium text-green-600">
                          +{queryResult.summary.avgPriceIncrease}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Avg Flood Risk:
                        </span>
                        <span className="font-medium text-orange-600">
                          {queryResult.summary.avgFloodRiskIncrease}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Time Period:
                        </span>
                        <span className="font-medium">
                          {queryResult.summary.timeRange}
                        </span>
                      </div>
                      {queryResult.summary.totalPopulation && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Population Affected:
                          </span>
                          <span className="font-medium">
                            {(
                              queryResult.summary.totalPopulation / 1000
                            ).toFixed(0)}
                            K
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Individual Areas */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Matching Areas</h3>
                    {queryResult.polygons.map((polygon) => (
                      <Card key={polygon.id}>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">
                            {polygon.properties.name}
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Price Change:
                              </span>
                              <span className="font-medium text-green-600">
                                +{polygon.properties.priceChange}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Flood Risk:</span>
                              <span className="font-medium text-orange-600">
                                {polygon.properties.floodRisk}%
                              </span>
                            </div>
                            {polygon.properties.population && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Population:
                                </span>
                                <span className="font-medium">
                                  {(
                                    polygon.properties.population / 1000
                                  ).toFixed(0)}
                                  K
                                </span>
                              </div>
                            )}
                            {polygon.properties.avgPropertyValue && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Avg Property Value:
                                </span>
                                <span className="font-medium">
                                  {polygon.properties.avgPropertyValue}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* AI Insights */}
                  {queryResult.insights && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          AI Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {queryResult.insights.map((insight, index) => (
                            <li
                              key={index}
                              className="text-sm text-gray-700 flex items-start gap-2"
                            >
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Evidence & Sources */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Data Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 text-gray-600">
                        {queryResult?.dataSource ? (
                          <>
                            <li>• {queryResult.dataSource.propertyData}</li>
                            <li>• {queryResult.dataSource.riskData}</li>
                            <li>• {queryResult.dataSource.boundaryData}</li>
                          </>
                        ) : (
                          <>
                            <li>
                              •{" "}
                              {CITY_CONFIGS[currentCity]?.dataSources
                                .property || "Property Registry"}
                            </li>
                            <li>
                              •{" "}
                              {CITY_CONFIGS[currentCity]?.dataSources.climate ||
                                "Climate Risk Assessment"}
                            </li>
                            <li>
                              •{" "}
                              {CITY_CONFIGS[currentCity]?.dataSources
                                .boundaries || "Municipal Corporation GIS"}
                            </li>
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
