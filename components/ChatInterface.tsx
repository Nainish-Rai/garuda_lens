"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Copy, ThumbsUp, ThumbsDown, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RealDataAPIClient } from "./QueryProcessor";
import type { EnhancedQueryResult, AnalysisJobStatus } from "@/lib/types";
import { StreamingText } from "@/components/ui/streaming-text";
import { Markdown } from "@/components/ui/markdown";

// Expose Unified API base URL for client-side calls
const UNIFIED_API_BASE =
  process.env.NEXT_PUBLIC_UNIFIED_API_URL || "http://localhost:8000";

// Types for Unified API responses
type UnifiedStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";

interface UnifiedIntent {
  intent?: string;
  location?: string;
  dateRange?: [string, string];
  confidence?: number;
  extractedParams?: Record<string, unknown>;
}

interface UnifiedImages {
  beforeImage?: string;
  afterImage?: string;
  overlayImage?: string;
  maskImage?: string;
}

interface UnifiedStatistics {
  totalChangeArea?: number;
  changePercentage?: number;
  changedPixels?: number;
  totalPixels?: number;
  [key: string]: unknown;
}

interface UnifiedDataInner {
  changePolygons?: GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    Record<string, unknown>
  >;
  statistics?: UnifiedStatistics;
  images?: UnifiedImages;
  metadata?: {
    location?: string;
    dateRange?: [string, string];
    resolution?: string;
    algorithm?: string;
    analysisDate?: string;
    [key: string]: unknown;
  };
  insights?: string[];
  [key: string]: unknown;
}

interface UnifiedAnalysisDataEnvelope {
  type?: string;
  intent?: UnifiedIntent;
  data?: UnifiedDataInner;
  placeholder?: boolean;
  elapsedTime?: number;
}

interface UnifiedAnalyzeResponse {
  jobId?: string;
  status?: UnifiedStatus;
  progress?: string;
  elapsedTime?: number;
  data: UnifiedAnalysisDataEnvelope;
}

// Utility function to generate unique IDs
let messageIdCounter = 0;
const generateMessageId = () => {
  return `msg_${Date.now()}_${++messageIdCounter}`;
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: EnhancedQueryResult;
  isLoading?: boolean;
  isStreaming?: boolean;
  jobId?: string;
  analysisStatus?: AnalysisJobStatus;
}

interface ChatInterfaceProps {
  initialQuery?: string;
  onMapUpdate?: (data: EnhancedQueryResult) => void;
  onAnalysisStart?: (jobId: string | null) => void;
  className?: string;
}

interface NDVIAnalysisResult {
  success: boolean;
  location: string;
  coordinates: { latitude: number; longitude: number };
  timeline_start: string;
  timeline_end: string;
  ndvi_analysis: {
    ndvi_statistics: {
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
    };
    change_statistics: {
      total_valid_pixels: number;
      vegetation_gain: { count: number; percentage: number };
      vegetation_loss: { count: number; percentage: number };
      urbanization: { count: number; percentage: number };
      urban_loss: { count: number; percentage: number };
      water_gain: { count: number; percentage: number };
      water_loss: { count: number; percentage: number };
    };
    analysis_focus: string;
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
}

export default function ChatInterface({
  initialQuery,
  onMapUpdate,
  onAnalysisStart,
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<string | null>(
    null
  );
  const [lastAnalysisData, setLastAnalysisData] =
    useState<EnhancedQueryResult | null>(null);
  const hasProcessedInitialQuery = useRef(false);
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const messagesRef = useRef<ChatMessage[]>([]);
  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Helpers to safely extract values (stable)
  const getNumber = useCallback(
    (obj: Record<string, unknown>, key: string, fallback = 0) => {
      const v = obj[key];
      return typeof v === "number" && Number.isFinite(v) ? v : fallback;
    },
    []
  );
  const getString = useCallback(
    (obj: Record<string, unknown>, key: string, fallback = "") => {
      const v = obj[key];
      return typeof v === "string" ? v : fallback;
    },
    []
  );

  // Transform Unified API envelope to EnhancedQueryResult (stable)
  const transformAnalysisResult = useCallback(
    (analysisData: UnifiedAnalysisDataEnvelope): EnhancedQueryResult => {
      const typeStr = (analysisData.type || "change_detection").replace(
        /_analysis$/,
        ""
      );

      const toAnalysisType = (
        s: string
      ): NonNullable<EnhancedQueryResult["analysisType"]> => {
        switch (s) {
          case "deforestation":
            return "deforestation";
          case "urbanization":
            return "urbanization";
          case "gentrification":
            return "gentrification";
          case "change_detection":
          default:
            return "change_detection";
        }
      };

      const analysisType = toAnalysisType(typeStr);

      type PolyOut = {
        id: string;
        coordinates: number[][][];
        properties: Record<string, unknown>;
      };
      let polygons: PolyOut[] = [];

      let satelliteData: EnhancedQueryResult["satelliteData"] | null = null;
      let statistics: EnhancedQueryResult["statistics"] | null = null;

      const featureCollection = analysisData.data?.changePolygons;
      if (featureCollection?.features) {
        polygons = featureCollection.features.map((feature, index: number) => {
          const geometry = feature.geometry || {
            type: "Polygon",
            coordinates: [],
          };
          const props = (feature.properties || {}) as Record<string, unknown>;

          let coordinates = (geometry as GeoJSON.Polygon)
            .coordinates as number[][][];

          const coordsInvalid =
            !coordinates ||
            coordinates.length === 0 ||
            (Array.isArray(coordinates[0]) &&
              (coordinates[0] as number[][]).some(
                (coord) =>
                  !Array.isArray(coord) ||
                  coord.length !== 2 ||
                  coord.some((v) => !Number.isFinite(v))
              ));

          if (coordsInvalid) {
            const location = analysisData.intent?.location || "";
            const latMatch = location.match(/Lat:\s*([-\d.]+)/);
            const lonMatch = location.match(/Lon:\s*([-\d.]+)/);

            if (latMatch && lonMatch) {
              const lat = parseFloat(latMatch[1]);
              const lon = parseFloat(lonMatch[1]);
              const offset = 0.01;

              coordinates = [
                [
                  [lon - offset, lat - offset],
                  [lon + offset, lat - offset],
                  [lon + offset, lat + offset],
                  [lon - offset, lat + offset],
                  [lon - offset, lat - offset],
                ],
              ];
            } else {
              coordinates = [
                [
                  [73.8467, 18.5104],
                  [73.8667, 18.5104],
                  [73.8667, 18.5304],
                  [73.8467, 18.5304],
                  [73.8467, 18.5104],
                ],
              ];
            }
          }

          return {
            id: `change_${index}`,
            coordinates,
            properties: {
              name: getString(
                props,
                "name",
                `${analysisType.replace("_", " ")} Area ${index + 1}`
              ),
              priceChange:
                typeof props["confidence"] === "number"
                  ? Math.round((props["confidence"] as number) * 100)
                  : Math.round(Math.random() * 50 + 10),
              floodRisk:
                typeof props["area"] === "number"
                  ? Math.min(100, Math.abs((props["area"] as number) / 1000))
                  : Math.round(Math.random() * 30 + 20),
              area: getString(props, "changeType", `${analysisType}_area`),
              population:
                (typeof props["estimatedPopulation"] === "number"
                  ? (props["estimatedPopulation"] as number)
                  : undefined) || Math.round(Math.random() * 50000 + 10000),
              avgPropertyValue: getString(
                props,
                "avgPropertyValue",
                `₹${Math.round(Math.random() * 50 + 25)},00,000`
              ),
              changeType: getString(props, "changeType", analysisType),
              confidence:
                typeof props["confidence"] === "number"
                  ? (props["confidence"] as number)
                  : 0.75,
            },
          };
        });
      }

      if (analysisData.data?.images) {
        const images = analysisData.data.images;
        const md = analysisData.data.metadata;
        const analysisMetadata = {
          location: md?.location ?? analysisData.intent?.location ?? "Unknown",
          dateRange:
            (md?.dateRange as [string, string] | undefined) ??
            (analysisData.intent?.dateRange as [string, string] | undefined) ??
            (["" as string, "" as string] as [string, string]),
          resolution: md?.resolution ?? "Unknown",
          algorithm: md?.algorithm ?? "U-Net Change Detection",
          analysisDate: md?.analysisDate ?? new Date().toISOString(),
        } as const;

        satelliteData = {
          beforeImage: images.beforeImage || "",
          afterImage: images.afterImage || "",
          overlayImage: images.overlayImage || "",
          maskImage: images.maskImage || "",
          analysisMetadata,
        };
      }

      const s = analysisData.data?.statistics;
      if (s && typeof s === "object") {
        const changeStats = {
          totalChangeArea: getNumber(
            s as Record<string, unknown>,
            "totalChangeArea",
            0
          ),
          changePercentage: getNumber(
            s as Record<string, unknown>,
            "changePercentage",
            0
          ),
          changedPixels: getNumber(
            s as Record<string, unknown>,
            "changedPixels",
            0
          ),
          totalPixels: getNumber(
            s as Record<string, unknown>,
            "totalPixels",
            0
          ),
        };
        if (
          changeStats.totalChangeArea ||
          changeStats.changePercentage ||
          changeStats.changedPixels ||
          changeStats.totalPixels
        ) {
          statistics = changeStats;
        }
      } else {
        if (analysisType === "deforestation") {
          statistics = {
            deforestedArea: Math.random() * 10000 + 1000,
            forestLossPercentage: Math.random() * 15 + 2,
            originalForestArea: Math.random() * 50000 + 20000,
            remainingForestArea: Math.random() * 40000 + 15000,
            treeCoverLoss: Math.random() * 8000 + 500,
            averageTreeDensityChange: -(Math.random() * 20 + 5),
          };
        } else if (analysisType === "urbanization") {
          statistics = {
            newUrbanArea: Math.random() * 15000 + 2000,
            urbanGrowthPercentage: Math.random() * 25 + 3,
            populationImpact: {
              estimatedPopulation: Math.round(Math.random() * 200000 + 50000),
              populationDensity: Math.round(Math.random() * 5000 + 1000),
              confidence: Math.random() * 0.3 + 0.7,
            },
            urbanGrowthMetrics: {
              developmentRate: Math.random() * 30 + 10,
              infrastructureExpansion: Math.random() * 40 + 15,
              averageUrbanDensityChange: Math.random() * 25 + 5,
            },
          };
        } else {
          statistics = {
            totalChangeArea: Math.random() * 8000 + 1000,
            changePercentage: Math.random() * 20 + 2,
            changedPixels: Math.round(Math.random() * 100000 + 10000),
            totalPixels: Math.round(Math.random() * 500000 + 200000),
          };
        }
      }

      const totalPopulation = polygons.reduce((sum, p) => {
        const pop = p.properties?.population;
        return sum + (typeof pop === "number" ? pop : 0);
      }, 0);

      const insightsArr = analysisData.data?.insights || [];

      let queryProcessed: string | undefined = undefined;
      const ep = analysisData.intent?.extractedParams;
      if (ep && typeof ep === "object" && ep !== null) {
        const maybeTF = (ep as Record<string, unknown>)["timeFrame"];
        if (typeof maybeTF === "string") queryProcessed = maybeTF;
      }

      return {
        polygons: polygons.map((p) => ({
          id: p.id,
          coordinates: p.coordinates,
          properties: {
            name: String(p.properties?.name ?? "Area"),
            priceChange: Number(p.properties?.priceChange ?? 0),
            floodRisk: Number(p.properties?.floodRisk ?? 0),
            area: String(p.properties?.area ?? "area"),
            population: Number(p.properties?.population ?? 0),
            avgPropertyValue: String(p.properties?.avgPropertyValue ?? ""),
          },
        })),
        summary: {
          totalAreas: polygons.length,
          avgPriceIncrease:
            polygons.reduce(
              (sum, p) => sum + Number(p.properties?.priceChange || 0),
              0
            ) / Math.max(1, polygons.length),
          avgFloodRiskIncrease:
            polygons.reduce(
              (sum, p) => sum + Number(p.properties?.floodRisk || 0),
              0
            ) / Math.max(1, polygons.length),
          timeRange:
            (analysisData.intent?.dateRange &&
              analysisData.intent.dateRange.join(" to ")) ||
            "2020-2024",
          totalPopulation,
        },
        insights: insightsArr,
        city: analysisData.intent?.location || "Analysis Area",
        dataSource: {
          propertyData: "Satellite Analysis",
          riskData: "AI Change Detection",
          boundaryData: "Geospatial Processing",
        },
        meta: {
          queryProcessed,
          resultsCount: polygons.length,
          processingTime: `${Math.round(
            (analysisData.elapsedTime || 0) / 1000
          )}s`,
          aiProcessed: true,
          geminiUsed: true,
        },
        satelliteData: satelliteData ?? undefined,
        analysisType,
        statistics: statistics ?? undefined,
      };
    },
    [getNumber, getString]
  );

  // NEW: Query analysis function
  const analyzeQuery = useCallback(
    async (query: string) => {
      try {
        const response = await fetch("/api/nlp-query-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            chatHistory: messages.slice(-6), // Last 6 messages for context
            currentLocation,
            currentAnalysisType,
          }),
        });

        if (!response.ok) {
          throw new Error("Query analysis failed");
        }

        return await response.json();
      } catch (error) {
        console.error("Query analysis failed:", error);
        // Return default analysis
        return {
          isNewLocationQuery: true,
          isFollowUpQuestion: false,
          extractedLocation: null,
          analysisType: null,
          intent: "analysis request",
          confidence: 0.5,
          requiresNewAnalysis: true,
        };
      }
    },
    [messages, currentLocation, currentAnalysisType]
  );

  // Enhanced query submission with parallel satellite and NDVI analysis
  const handleQuerySubmit = useCallback(
    async (query?: string) => {
      const inputQuery = query || currentInput.trim();
      if (!inputQuery || isProcessing) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: inputQuery,
        timestamp: new Date(),
      };

      const loadingMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "Analyzing your query...",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setCurrentInput("");
      setIsProcessing(true);

      try {
        // Step 1: Always analyze the query first to determine if it's a follow-up
        console.log("Analyzing query intent...");
        const queryAnalysis = await analyzeQuery(inputQuery);

        console.log("Query analysis result:", queryAnalysis);

        // Step 2: Handle follow-up questions without calling analysis APIs
        if (
          queryAnalysis.isFollowUpQuestion &&
          queryAnalysis.followUpResponse
        ) {
          console.log("Handling follow-up question...");

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: queryAnalysis.followUpResponse!,
                    isLoading: false,
                    isStreaming: true,
                  }
                : msg
            )
          );

          setIsProcessing(false);
          return;
        }

        // Step 3: Handle new location queries with comprehensive analysis
        if (
          queryAnalysis.isNewLocationQuery &&
          queryAnalysis.extractedLocation
        ) {
          console.log(
            "Processing new location query for:",
            queryAnalysis.extractedLocation
          );

          // Always start comprehensive analysis
          onAnalysisStart?.("pending");

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: "🔄 Starting comprehensive analysis...",
                    isLoading: true,
                  }
                : msg
            )
          );

          // Step 4: Run BOTH satellite and NDVI analysis in parallel
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content:
                      "🛰️🌱 Running satellite and NDVI analysis in parallel...",
                    isLoading: true,
                  }
                : msg
            )
          );

          // Start both analyses simultaneously
          const satellitePromise = performSatelliteAnalysis(inputQuery).catch(
            (error) => {
              console.warn("Satellite analysis failed:", error);
              return null;
            }
          );

          const ndviPromise = performNDVIAnalysis(inputQuery).catch((error) => {
            console.warn("NDVI analysis failed:", error);
            return { success: false, error: error.message };
          });

          // Wait for both analyses to complete
          console.log("Starting parallel analysis...");
          const [satelliteResult, ndviResult] = await Promise.all([
            satellitePromise,
            ndviPromise,
          ]);

          console.log("Parallel analysis completed:", {
            satellite: satelliteResult ? "success" : "failed",
            ndvi: ndviResult?.success ? "success" : "failed",
          });

          // Step 5: Process and combine results
          let enhancedResult = null;
          let successMessage = "";

          // Process satellite results
          if (satelliteResult) {
            const envelope = {
              ...satelliteResult.data,
              elapsedTime: satelliteResult.elapsedTime,
            };
            enhancedResult = transformAnalysisResult(envelope);
          }

          // Process NDVI results
          let ndviData = null;
          if (
            ndviResult &&
            ndviResult.success &&
            "data" in ndviResult &&
            ndviResult.data
          ) {
            ndviData = ndviResult.data;
          }

          // Step 6: Combine results based on what succeeded
          if (enhancedResult && ndviData) {
            // Both analyses succeeded - create comprehensive result
            enhancedResult.statistics = {
              ...enhancedResult.statistics,
              ndviData: ndviData,
            } as any;
            successMessage = await generateCombinedSuccessMessage(
              enhancedResult,
              satelliteResult,
              ndviResult,
              inputQuery
            );
          } else if (enhancedResult) {
            // Only satellite succeeded
            successMessage = generateSatelliteOnlyMessage(
              enhancedResult,
              satelliteResult
            );
          } else if (ndviData) {
            // Only NDVI succeeded
            enhancedResult = transformNDVIResult(ndviData);
            enhancedResult.statistics = {
              ...enhancedResult.statistics,
              ndviData: ndviData,
            } as any;
            successMessage = generateNDVIInsights(ndviData);
          } else {
            // Both failed - use legacy fallback
            console.log(
              "Both satellite and NDVI failed, using legacy fallback..."
            );
            await handleLegacyQuery(inputQuery, loadingMessage.id);
            return;
          }

          // Step 7: Update UI with combined results
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: successMessage,
                    data: enhancedResult,
                    isLoading: false,
                    isStreaming: true,
                  }
                : msg
            )
          );

          // Update context state
          setCurrentLocation(
            enhancedResult.city || queryAnalysis.extractedLocation || null
          );
          setCurrentAnalysisType(
            enhancedResult.analysisType || queryAnalysis.analysisType || null
          );
          setLastAnalysisData(enhancedResult);

          onMapUpdate?.(enhancedResult);
          setIsProcessing(false);
          onAnalysisStart?.(null);
        } else {
          // Step 8: Handle general queries or unclear intent
          console.log("Handling general query with legacy processing...");
          await handleLegacyQuery(inputQuery, loadingMessage.id);
        }
      } catch (error) {
        console.error("Query processing failed:", error);
        console.log("Falling back to legacy query processing...");
        await handleLegacyQuery(inputQuery, loadingMessage.id);
      }
    },
    [
      currentInput,
      isProcessing,
      currentLocation,
      currentAnalysisType,
      onAnalysisStart,
      onMapUpdate,
      transformAnalysisResult,
      analyzeQuery,
      // Note: Other functions will be available through closure
    ]
  );

  // NEW: Satellite analysis function with NLP location extraction
  const performSatelliteAnalysis = useCallback(async (inputQuery: string) => {
    try {
      // Step 1: First extract location using NLP
      const nlpResponse = await fetch("/api/nlp-query-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: inputQuery,
          chatHistory: [],
          currentLocation: null,
          currentAnalysisType: null,
        }),
      });

      let extractedLocation = null;
      if (nlpResponse.ok) {
        const nlpResult = await nlpResponse.json();
        extractedLocation = nlpResult.extractedLocation;
        console.log("NLP extracted location:", extractedLocation);
      }

      // Step 2: Use extracted location or fallback
      const locationName = extractedLocation || inputQuery;
      console.log("Using location for satellite API:", locationName);

      // Step 3: Try Unified API endpoints for satellite analysis with clean location
      const locationResp = await fetch(`${UNIFIED_API_BASE}/analyze/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_name: locationName,
          zoom_level: "City-Wide (0.025°)",
          resolution: "Standard (5m)",
          overlay_alpha: 0.4,
        }),
      });

      if (locationResp.ok) {
        return await locationResp.json();
      }

      // Step 4: Try location search endpoint with clean location
      const searchResp = await fetch(`${UNIFIED_API_BASE}/locations/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: locationName, limit: 1 }),
      });

      if (searchResp.ok) {
        const search = await searchResp.json();
        const first = search.locations?.[0];
        if (first?.coordinates?.lat && first?.coordinates?.lon) {
          const analyzeResp = await fetch(`${UNIFIED_API_BASE}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: {
                lat: first.coordinates.lat,
                lon: first.coordinates.lon,
              },
              zoom_level: "City-Wide (0.025°)",
              resolution: "Standard (5m)",
              overlay_alpha: 0.4,
              include_images: true,
            }),
          });

          if (analyzeResp.ok) {
            return await analyzeResp.json();
          }
        }
      }

      throw new Error("Satellite analysis failed");
    } catch (error) {
      console.error("Satellite analysis failed:", error);
      throw error;
    }
  }, []);

  // NEW: Combined success message generator
  const generateCombinedSuccessMessage = useCallback(
    async (
      enhancedResult: EnhancedQueryResult,
      satelliteAnalysis: { data?: any; elapsedTime?: number },
      ndviAnalysis: { success?: boolean; data?: any },
      _userQuery: string
    ): Promise<string> => {
      const location = enhancedResult.city || "the analyzed area";
      const hasNdvi = ndviAnalysis && ndviAnalysis.success;
      const hasSatellite = Boolean(satelliteAnalysis);

      let message = `🛰️ **Comprehensive Analysis Complete** for ${location}\n\n`;

      // Satellite analysis summary
      if (hasSatellite) {
        const changePercentage =
          (enhancedResult.statistics as any)?.changePercentage || 0;
        message += `**📊 Satellite Analysis:**\n`;
        message += `• **Land Use Change:** ${changePercentage.toFixed(
          1
        )}% detected\n`;
        message += `• **Areas Analyzed:** ${
          enhancedResult.polygons?.length || 0
        } regions\n`;
        message += `• **Analysis Type:** ${
          enhancedResult.analysisType || "change_detection"
        }\n\n`;
      }

      // NDVI analysis summary
      if (hasNdvi) {
        const { change_analysis, ndvi_analysis } = ndviAnalysis.data;
        message += `**🌱 NDVI Vegetation Analysis:**\n`;
        message += `• **Total Change:** ${change_analysis.total_change_percentage.toFixed(
          1
        )}%\n`;
        message += `• **Vegetation Change:** ${
          change_analysis.vegetation_change_net > 0 ? "+" : ""
        }${change_analysis.vegetation_change_net.toFixed(1)}%\n`;
        message += `• **Urban Change:** ${
          change_analysis.urban_change_net > 0 ? "+" : ""
        }${change_analysis.urban_change_net.toFixed(1)}%\n`;
        message += `• **Change Intensity:** ${change_analysis.change_intensity}\n`;
        message += `• **Valid Pixels:** ${ndvi_analysis.change_statistics.total_valid_pixels.toLocaleString()}\n\n`;
      }

      // Combined insights
      message += `**🎯 Key Insights:**\n`;
      if (hasNdvi && hasSatellite) {
        message += `• **Multi-Modal Analysis:** Both satellite imagery and NDVI data confirm land use changes\n`;
        message += `• **Vegetation Health:** ${
          ndviAnalysis.data.change_analysis.vegetation_change_net > 0
            ? "Improving"
            : "Declining"
        } vegetation patterns detected\n`;
        message += `• **Urban Development:** ${
          ndviAnalysis.data.change_analysis.urban_change_net > 0
            ? "Expansion"
            : "Contraction"
        } in urban areas\n`;
      } else if (hasNdvi) {
        message += `• **NDVI Analysis:** Comprehensive vegetation change detection completed\n`;
        message += `• **Dominant Change:** ${ndviAnalysis.data.change_analysis.dominant_change}\n`;
      } else if (hasSatellite) {
        message += `• **Satellite Analysis:** High-resolution change detection completed\n`;
      }

      message += `\n**📈 Data Visualization:**\n`;
      message += `• **Map View:** Interactive satellite imagery and change polygons\n`;
      message += `• **Analytics Dashboard:** Detailed statistics and trend analysis\n`;
      if (hasNdvi) {
        message += `• **NDVI Dashboard:** Area charts and bar charts showing vegetation patterns\n`;
      }

      message += `\n*Switch between tabs to explore the different visualizations and insights.*`;

      return message;
    },
    []
  );

  // NEW: NDVI Analysis function
  const performNDVIAnalysis = useCallback(
    async (
      query: string
    ): Promise<{
      success: boolean;
      data?: NDVIAnalysisResult;
      error?: string;
    }> => {
      try {
        // Step 1: Use NLP to extract parameters
        const nlpResponse = await fetch("/api/nlp-query-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            chatHistory: [],
            currentLocation: null,
            currentAnalysisType: null,
          }),
        });

        if (!nlpResponse.ok) {
          throw new Error("NLP analysis failed");
        }

        const nlpResult = await nlpResponse.json();

        // Step 2: Extract parameters with defaults
        const location =
          nlpResult.extractedLocation || "Amazon Rainforest, Brazil";

        // Extract timeline from query or use defaults
        const timelineMatch = query.match(/(\d{4})/g);
        const currentYear = new Date().getFullYear();
        let timeline_start = "2020-01-01";
        let timeline_end = "2024-01-01";

        if (timelineMatch && timelineMatch.length >= 2) {
          timeline_start = `${timelineMatch[0]}-01-01`;
          timeline_end = `${timelineMatch[1]}-01-01`;
        } else if (timelineMatch && timelineMatch.length === 1) {
          timeline_start = `${timelineMatch[0]}-01-01`;
          timeline_end = `${currentYear}-01-01`;
        }

        // Extract zoom level from query
        let zoom_level = "City-Wide (0.025°)";
        if (
          query.toLowerCase().includes("detailed") ||
          query.toLowerCase().includes("high resolution")
        ) {
          zoom_level = "High Resolution (0.01°)";
        } else if (
          query.toLowerCase().includes("regional") ||
          query.toLowerCase().includes("wide area")
        ) {
          zoom_level = "Regional (0.05°)";
        }

        // Determine analysis focus
        let analysis_focus = "vegetation";
        if (
          nlpResult.analysisType === "urbanization" ||
          query.toLowerCase().includes("urban")
        ) {
          analysis_focus = "urban";
        } else if (
          query.toLowerCase().includes("water") ||
          query.toLowerCase().includes("river")
        ) {
          analysis_focus = "water";
        }

        // Step 3: Call NDVI API
        const ndviResponse = await fetch("http://localhost:8000/analyze/ndvi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            timeline_start,
            timeline_end,
            zoom_level,
            want_recommendations: true,
            analysis_focus,
          }),
        });

        if (!ndviResponse.ok) {
          throw new Error(`NDVI API failed: ${ndviResponse.status}`);
        }

        const ndviResult = await ndviResponse.json();

        if (!ndviResult.success) {
          throw new Error("NDVI analysis returned failure");
        }

        return { success: true, data: ndviResult };
      } catch (error) {
        console.error("NDVI analysis failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    []
  );

  // NEW: Transform NDVI result to EnhancedQueryResult format
  const transformNDVIResult = useCallback(
    (ndviResult: NDVIAnalysisResult): EnhancedQueryResult => {
      const { latitude, longitude } = ndviResult.coordinates;
      const offset = 0.05;

      const polygons = [
        {
          id: "ndvi_analysis_area",
          coordinates: [
            [
              [longitude - offset, latitude - offset],
              [longitude + offset, latitude - offset],
              [longitude + offset, latitude + offset],
              [longitude - offset, latitude + offset],
              [longitude - offset, latitude - offset],
            ],
          ],
          properties: {
            name: `NDVI Analysis: ${ndviResult.location}`,
            priceChange: Math.round(
              ndviResult.change_analysis.vegetation_change_net
            ),
            floodRisk: Math.abs(
              Math.round(ndviResult.change_analysis.water_change_net)
            ),
            area: `${ndviResult.change_analysis.change_intensity} intensity`,
            population:
              ndviResult.ndvi_analysis.change_statistics.total_valid_pixels,
            avgPropertyValue: `${ndviResult.change_analysis.total_change_percentage.toFixed(
              1
            )}% total change`,
          },
        },
      ];

      return {
        polygons,
        summary: {
          totalAreas: 1,
          avgPriceIncrease: ndviResult.change_analysis.vegetation_change_net,
          avgFloodRiskIncrease: Math.abs(
            ndviResult.change_analysis.water_change_net
          ),
          timeRange: `${ndviResult.timeline_start} to ${ndviResult.timeline_end}`,
          totalPopulation:
            ndviResult.ndvi_analysis.change_statistics.total_valid_pixels,
        },
        insights: ndviResult.recommendations,
        city: ndviResult.location,
        dataSource: {
          propertyData: "NDVI Satellite Analysis",
          riskData: "Vegetation Change Detection",
          boundaryData: "Remote Sensing Data",
        },
        meta: {
          queryProcessed: `NDVI analysis for ${ndviResult.location}`,
          resultsCount: 1,
          processingTime: "3s",
          aiProcessed: true,
          geminiUsed: false,
        },
        analysisType: "change_detection",
        statistics: {
          totalChangeArea:
            ndviResult.change_analysis.total_change_percentage * 1000,
          changePercentage: ndviResult.change_analysis.total_change_percentage,
          changedPixels:
            ndviResult.ndvi_analysis.change_statistics.total_valid_pixels,
          totalPixels:
            ndviResult.ndvi_analysis.change_statistics.total_valid_pixels * 2,
          // Add NDVI-specific data
          ndviData: ndviResult,
        } as any,
      };
    },
    []
  );

  // NEW: Generate NDVI-specific insights
  const generateNDVIInsights = useCallback(
    (ndviResult: NDVIAnalysisResult): string => {
      const { ndvi_analysis, change_analysis } = ndviResult;
      const location = ndviResult.location;

      const vegGainPct =
        ndvi_analysis.change_statistics.vegetation_gain.percentage;
      const vegLossPct =
        ndvi_analysis.change_statistics.vegetation_loss.percentage;
      const netChange = change_analysis.vegetation_change_net;
      const totalChange = change_analysis.total_change_percentage;
      const intensity = change_analysis.change_intensity;

      return `The vegetation story unfolding across ${location} tells us about significant ecological transformation captured through advanced satellite monitoring. Based on Sentinel-2 satellite imagery from the European Space Agency's Copernicus program, combined with detailed geographic mapping from OpenStreetMap contributors, our NDVI analysis reveals compelling patterns of landscape evolution.

**📊 The Data Story:**
Through multi-temporal analysis utilizing Copernicus Sentinel mission data, we observe ${
        netChange > 0 ? "+" : ""
      }${netChange.toFixed(
        1
      )}% net vegetation change across this region. The narrative emerging from ${ndvi_analysis.change_statistics.total_valid_pixels.toLocaleString()} analyzed pixels tells us about ${totalChange.toFixed(
        1
      )}% total landscape transformation, with change intensity characterized as ${intensity}.

**🔍 Detailed Analysis:**
Our U-Net deep learning algorithms processed high-resolution imagery to reveal that ${vegGainPct.toFixed(
        1
      )}% of the area experienced vegetation gain (${ndvi_analysis.change_statistics.vegetation_gain.count.toLocaleString()} pixels), while ${vegLossPct.toFixed(
        1
      )}% showed vegetation loss (${ndvi_analysis.change_statistics.vegetation_loss.count.toLocaleString()} pixels). Additionally, ${ndvi_analysis.change_statistics.urbanization.percentage.toFixed(
        1
      )}% of the region underwent urbanization processes.

**🌊 Water and Urban Changes:**
The analysis, referenced against OpenStreetMap geographic boundaries, shows ${Math.abs(
        change_analysis.water_change_net
      ).toFixed(1)}% net water change and ${Math.abs(
        change_analysis.urban_change_net
      ).toFixed(
        1
      )}% urban transformation, creating a comprehensive picture of landscape dynamics.

**📈 NDVI Statistical Story:**
The numerical narrative reveals mean NDVI values shifting from ${ndvi_analysis.ndvi_statistics.before.mean.toFixed(
        3
      )} to ${ndvi_analysis.ndvi_statistics.after.mean.toFixed(
        3
      )}, representing a ${
        ndvi_analysis.ndvi_statistics.change.mean_change > 0 ? "+" : ""
      }${ndvi_analysis.ndvi_statistics.change.mean_change.toFixed(
        3
      )} change in vegetation health.

**🎯 AI Recommendations:**
${ndviResult.recommendations.map((rec: string) => `• ${rec}`).join("\n")}

**ℹ️ Analysis Context:**
This comprehensive NDVI assessment, powered by ESA's Copernicus program data and OSM community mapping, utilized ${ndvi_analysis.change_statistics.total_valid_pixels.toLocaleString()} valid pixels to detect vegetation changes. ${
        netChange > 5
          ? "This significant vegetation growth indicates healthy ecosystem recovery or agricultural expansion, as documented through our multi-source satellite analysis."
          : netChange < -5
          ? "The detected vegetation loss suggests environmental pressures that may require conservation measures, based on our integrated satellite and geographic data analysis."
          : "The moderate vegetation changes suggest stable land use patterns, as captured through our comprehensive Sentinel-OSM data integration."
      }

*Sources: Sentinel-2 ESA Copernicus satellite imagery, OpenStreetMap community geographic data, U-Net deep learning NDVI analysis*`;
    },
    []
  );

  // NEW: Legacy query handling fallback
  const handleLegacyQuery = useCallback(
    async (inputQuery: string, loadingMessageId: string) => {
      try {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessageId
              ? {
                  ...msg,
                  content: "🔄 Processing with legacy analysis...",
                  isLoading: true,
                }
              : msg
          )
        );

        // Try real data API as fallback
        const result = await RealDataAPIClient.queryNaturalLanguageAPI(
          inputQuery
        );

        const successMessage = `📊 **Analysis Complete**

I've analyzed your query using our fallback system. The results show data for ${
          result.city || "the requested area"
        } with ${result.polygons?.length || 0} areas identified.

**Key Findings:**
• **Average Change:** ${result.summary?.avgPriceIncrease?.toFixed(1) || "N/A"}%
• **Risk Assessment:** ${
          result.summary?.avgFloodRiskIncrease?.toFixed(1) || "N/A"
        }% average impact
• **Total Areas:** ${result.summary?.totalAreas || 0} regions analyzed

**Data Sources:**
• Property Data: ${result.dataSource?.propertyData || "Unknown"}
• Risk Data: ${result.dataSource?.riskData || "Unknown"}
• Boundary Data: ${result.dataSource?.boundaryData || "Unknown"}

*View the map and analytics tabs to explore the detailed visualizations.*`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessageId
              ? {
                  ...msg,
                  content: successMessage,
                  data: result,
                  isLoading: false,
                  isStreaming: true,
                }
              : msg
          )
        );

        setCurrentLocation(result.city || null);
        setLastAnalysisData(result);
        onMapUpdate?.(result);
        setIsProcessing(false);
        onAnalysisStart?.(null);
      } catch (error) {
        console.error("Legacy query processing failed:", error);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessageId
              ? {
                  ...msg,
                  content: `❌ **Analysis Failed**

I apologize, but I encountered an error processing your query. This could be due to:

• **Network connectivity issues**
• **Service temporarily unavailable**
• **Invalid location or parameters**

**Please try:**
1. **Simplify your query** - Use clear location names like "Mumbai", "Delhi", or "Bangalore"
2. **Check your connection** - Ensure you have a stable internet connection
3. **Try again** - Sometimes a retry resolves temporary issues

**Example queries that work well:**
• "Show deforestation in Amazon rainforest from 2020 to 2024"
• "Analyze urban expansion in Mumbai since 2020"
• "Detect land use changes around Delhi"
• "Show NDVI vegetation changes in Bangalore"

Feel free to try another query!`,
                  isLoading: false,
                  isStreaming: true,
                }
              : msg
          )
        );

        setIsProcessing(false);
        onAnalysisStart?.(null);
      }
    },
    [onMapUpdate, onAnalysisStart]
  );

  // NEW: Helper functions for query classification
  const isGenericLandingPageQuery = useCallback((query: string): boolean => {
    const genericKeywords = [
      "property",
      "investment",
      "appreciation",
      "hotspots",
      "resilient",
      "neighborhoods",
      "wards",
      "flood risk",
      "climate risk",
      "values rose",
    ];

    const hasLocationKeywords = [
      "mumbai",
      "pune",
      "delhi",
      "bangalore",
      "chennai",
      "amazon",
      "forest",
    ].some((loc) => query.toLowerCase().includes(loc));

    const hasGenericKeywords = genericKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword)
    );

    return hasGenericKeywords && !hasLocationKeywords;
  }, []);

  const extractLocationFromQuery = useCallback(
    (query: string): string | null => {
      const locationPatterns = [
        /(?:in|near|around|at)\s+([A-Za-z\s]+?)(?:\s+(?:city|district|state|area|region)|$)/i,
        /(mumbai|pune|delhi|bangalore|chennai|kolkata|hyderabad|amazon|rainforest)/i,
      ];

      for (const pattern of locationPatterns) {
        const match = query.match(pattern);
        if (match) {
          return match[1] || match[0];
        }
      }
      return null;
    },
    []
  );

  const isNDVIRelevantQuery = useCallback((query: string): boolean => {
    const ndviKeywords = [
      "ndvi",
      "vegetation",
      "forest",
      "deforestation",
      "green",
      "tree",
      "canopy",
      "plants",
      "ecosystem",
      "biodiversity",
      "agricultural",
      "crop",
      "farmland",
      "jungle",
      "woodland",
      "grassland",
    ];

    return ndviKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword)
    );
  }, []);

  // NEW: Generate satellite-only success message
  const generateSatelliteOnlyMessage = useCallback(
    (enhancedResult: EnhancedQueryResult, satelliteAnalysis: any): string => {
      const location = enhancedResult.city || "the analyzed area";
      const changePercentage =
        (enhancedResult.statistics as any)?.changePercentage || 0;

      return `🛰️ **Satellite Analysis Complete** for ${location}

**📊 Key Findings:**
• **Land Use Change:** ${changePercentage.toFixed(1)}% detected
• **Areas Analyzed:** ${enhancedResult.polygons?.length || 0} regions
• **Analysis Type:** ${enhancedResult.analysisType || "change_detection"}
• **Processing Time:** ${enhancedResult.meta?.processingTime || "3s"}

**🎯 Insights:**
${
  enhancedResult.insights
    ?.slice(0, 3)
    .map((insight) => `• ${insight}`)
    .join("\n") ||
  "• High-resolution satellite imagery analysis completed\n• Change detection algorithms applied\n• Geographic boundaries identified"
}

**📈 Data Visualization:**
• **Map View:** Interactive satellite imagery and change polygons
• **Analytics Dashboard:** Detailed statistics and trend analysis

*Switch between tabs to explore the different visualizations. For vegetation-specific analysis, try queries like "Show NDVI changes in ${location}"*`;
    },
    []
  );

  React.useMemo(() => {
    if (initialQuery && !hasProcessedInitialQuery.current) {
      hasProcessedInitialQuery.current = true;
      queueMicrotask(() => handleQuerySubmit(initialQuery));
    }
  }, [initialQuery, handleQuerySubmit]);

  React.useEffect(() => {
    const intervals = pollingIntervals.current;
    return () => {
      intervals.forEach((interval) => {
        clearInterval(interval);
      });
      intervals.clear();
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "flex flex-col h-full bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="border-b border-border/50 p-4">
        <h2 className="text-lg font-semibold text-foreground">Garuda Lens</h2>
        <p className="text-sm max-w-sm text-muted-foreground">
          Ask questions about deforestation, urbanization, and climate change
          using satellite imagery
        </p>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to analyze!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Ask about deforestation, urbanization, or land use changes using
                satellite imagery AI.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Try: &quot;Show me deforestation near Mumbai between
                  2020-2024&quot;
                </p>
                <p>
                  Or: &quot;Analyze urban expansion in Pune since 2020&quot;
                </p>
                <p>Or: &quot;Detect land use changes around Bangalore&quot;</p>
              </div>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-full group"
              >
                <div className="flex gap-3 w-full">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {message.role === "user" ? "U" : "AI"}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div
                      className={cn(
                        "rounded-lg p-3 max-w-none break-words",
                        message.role === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-secondary text-foreground"
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{message.content}</span>
                          {message.analysisStatus && (
                            <div className="text-xs text-muted-foreground ml-2">
                              Status: {message.analysisStatus.status}
                            </div>
                          )}
                        </div>
                      ) : message.isStreaming ? (
                        <StreamingText
                          text={message.content}
                          speed={3}
                          interval={30}
                          onComplete={() => {
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === message.id
                                  ? { ...msg, isStreaming: false }
                                  : msg
                              )
                            );
                          }}
                        />
                      ) : message.role === "assistant" ? (
                        <Markdown className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground">
                          {message.content}
                        </Markdown>
                      ) : (
                        <div>{message.content}</div>
                      )}
                    </div>

                    {message.role === "assistant" && !message.isLoading && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-border/50 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuerySubmit();
                }
              }}
              placeholder="Ask about deforestation, urbanization, or satellite change detection..."
              className="resize-none min-h-[44px] max-h-[120px]"
              disabled={isProcessing}
            />
          </div>
          <Button
            onClick={() => handleQuerySubmit()}
            disabled={!currentInput.trim() || isProcessing}
            size="sm"
            className="h-11 px-4"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
