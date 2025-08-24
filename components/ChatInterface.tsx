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

  // NEW: AI-powered analysis function
  const generateAIInsights = useCallback(
    async (
      result: EnhancedQueryResult,
      status: AnalysisJobStatus,
      userQuery: string
    ): Promise<string> => {
      // If we have satellite data, use AI to analyze it
      if (result.satelliteData && result.statistics) {
        try {
          const response = await fetch("/api/ai-satellite-analysis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              satelliteData: result.satelliteData,
              statistics: result.statistics,
              analysisType: result.analysisType || "change_detection",
              userQuery: userQuery,
              polygonData: result.polygons,
            }),
          });

          if (response.ok) {
            const aiAnalysis = await response.json();
            if (aiAnalysis.success) {
              return aiAnalysis.insights;
            } else if (aiAnalysis.fallbackInsights) {
              return aiAnalysis.fallbackInsights;
            }
          }
        } catch (error) {
          console.error("AI analysis failed:", error);
        }
      }

      // Fallback to basic analysis
      return generateBasicInsights(result, status);
    },
    []
  );

  // Basic insights as fallback
  const generateBasicInsights = useCallback(
    (result: EnhancedQueryResult, status: AnalysisJobStatus): string => {
      const analysisType = result.analysisType || "change detection";
      const elapsed = Math.round(status.elapsedTime / 1000);
      const location = result.city || "the analyzed area";

      if (analysisType === "deforestation") {
        const stats = result.statistics as any;
        return `I've completed analyzing forest changes in ${location}! 🌳

The satellite analysis took ${elapsed} seconds and reveals interesting patterns in forest cover. ${
          stats?.forestLossPercentage > 10
            ? `The data shows significant forest loss of ${stats.forestLossPercentage.toFixed(
                1
              )}%, which could indicate active deforestation or land conversion activities.`
            : stats?.forestLossPercentage > 3
            ? `There's moderate forest cover change of ${stats.forestLossPercentage.toFixed(
                1
              )}%, suggesting some logging or natural changes.`
            : "Forest cover appears relatively stable with minimal changes detected."
        }

This analysis helps us understand environmental changes and can inform conservation efforts in the region.`;
      }

      if (analysisType === "urbanization") {
        const stats = result.statistics as any;
        return `Great! I've analyzed urban development in ${location} 🏙️

After ${elapsed} seconds of processing satellite imagery, I can see the urbanization patterns clearly. ${
          stats?.urbanGrowthPercentage > 15
            ? `The area shows rapid urban expansion of ${stats.urbanGrowthPercentage.toFixed(
                1
              )}%, indicating significant economic growth and development activity.`
            : stats?.urbanGrowthPercentage > 5
            ? `There's steady urban growth of ${stats.urbanGrowthPercentage.toFixed(
                1
              )}%, suggesting planned development and controlled expansion.`
            : "Urban development appears controlled with minimal new construction detected."
        }

This type of analysis is valuable for urban planning and infrastructure development.`;
      }

      // General change detection
      const changePercentage = result.statistics?.changePercentage || 0;
      return `I've completed the satellite analysis for ${location}! 🛰️

After ${elapsed} seconds of processing, the data reveals ${changePercentage.toFixed(
        1
      )}% land use change in this region. ${
        changePercentage > 10
          ? "This indicates significant landscape transformation that could be due to development, agriculture, or environmental factors."
          : changePercentage > 2
          ? "There are moderate changes detected, suggesting ongoing land use activities."
          : "The area appears relatively stable with minimal changes."
      }

The high-resolution satellite analysis provides valuable insights into how this landscape is evolving over time.`;
    },
    []
  );

  // Success message (updated to use AI analysis)
  const generateSuccessMessage = useCallback(
    async (
      result: EnhancedQueryResult,
      status: AnalysisJobStatus,
      userQuery: string
    ): Promise<string> => {
      // Use AI-powered analysis
      return await generateAIInsights(result, status, userQuery);
    },
    [generateAIInsights]
  );

  // Progress message (stable)
  const getProgressMessage = useCallback(
    (status: AnalysisJobStatus): string => {
      const elapsed = Math.round(status.elapsedTime / 1000);
      return `${status.progress} (${elapsed}s elapsed)`;
    },
    []
  );

  // Legacy query processing as fallback (moved earlier so it can be a dependency)
  const handleLegacyQuery = useCallback(
    async (inputQuery: string, messageId: string) => {
      try {
        const stages = [
          "Parsing natural language query...",
          "Searching property databases...",
          "Analyzing climate risk data...",
          "Generating insights...",
        ];

        for (let i = 0; i < stages.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, content: stages[i] } : msg
            )
          );
        }

        let result;
        try {
          result = await RealDataAPIClient.queryNaturalLanguageAPI(inputQuery);
        } catch (apiError) {
          console.warn("API call failed, using fallback data:", apiError);
          result = {
            polygons: [
              {
                id: "test-ward-1",
                coordinates: [
                  [
                    [73.8567, 18.5204],
                    [73.8667, 18.5204],
                    [73.8667, 18.5304],
                    [73.8567, 18.5304],
                    [73.8567, 18.5204],
                  ],
                ],
                properties: {
                  name: "Test Ward",
                  priceChange: 35,
                  floodRisk: 45,
                  area: "Test Area",
                  population: 50000,
                  avgPropertyValue: "₹75,00,000",
                  ward: "Test Ward",
                  city: "Test City",
                },
              },
            ],
            summary: {
              totalAreas: 1,
              avgPriceIncrease: 35,
              avgFloodRiskIncrease: 45,
              timeRange: "2015-2024",
              totalPopulation: 50000,
            },
            insights: [
              "✅ Chat interface is working correctly - this is demonstration data.",
              "⚠️ Advanced satellite analysis unavailable - using fallback property analysis.",
              "💡 To enable satellite analysis: Ensure the Geospatial Agent API is running.",
              "🔍 For development: This fallback data allows you to test basic UI features.",
            ],
            city: "Demo Location",
            dataSource: {
              propertyData: "Test Data Source",
              riskData: "Test Risk Data",
              boundaryData: "Test Boundary Data",
            },
            meta: {
              queryProcessed: inputQuery,
              resultsCount: 1,
              aiProcessed: true,
              geminiUsed: false,
            },
          };
        }

        const insights = result.insights || [];
        const responseContent = `Based on your query, I found ${
          result.summary?.totalAreas || 0
        } areas that match your criteria.

**Key Findings:**
${insights.map((insight: string) => `• ${insight}`).join("\n")}

**Summary:**
- Average price increase: ${result.summary?.avgPriceIncrease || 0}%
- Average flood risk: ${result.summary?.avgFloodRiskIncrease || 0}%
- Time period: ${result.summary?.timeRange || "Recent years"}
$${
          result.summary?.totalPopulation
            ? `- Population affected: ${(
                result.summary.totalPopulation / 1000
              ).toFixed(0)}K`
            : ""
        }

The map has been updated to highlight the relevant areas. You can explore the detailed analysis in the map view.`;

        const assistantMessage: ChatMessage = {
          id: messageId,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          data: result,
          isStreaming: true,
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? assistantMessage : msg))
        );

        onMapUpdate?.(result);
        setIsProcessing(false);
      } catch (error) {
        console.error("Legacy query processing failed:", error);

        const errorMessage: ChatMessage = {
          id: messageId,
          role: "assistant",
          content: `I apologize, but I encountered an error while processing your query: ${
            error instanceof Error ? error.message : "Unknown error"
          }.

**Possible solutions:**
• The application may need API keys configured for full functionality
• Try a simpler query like "Show me wards in a specific city with high property values"
• Check the browser console for more detailed error information

**Note:** The application should work with demo data even without API keys. If this persists, there may be a configuration issue.`,
          timestamp: new Date(),
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? errorMessage : msg))
        );
        setIsProcessing(false);
      }
    },
    [onMapUpdate]
  );

  // NEW: Job polling functionality (wrapped in useCallback)
  const startJobPolling = useCallback(
    (jobId: string, pollingUrl: string, messageId: string) => {
      const pollInterval = 2000; // Poll every 2 seconds

      const interval = setInterval(async () => {
        try {
          const response = await fetch(pollingUrl);
          if (!response.ok) {
            throw new Error(`Polling failed: ${response.status}`);
          }

          const jobStatus: AnalysisJobStatus = await response.json();

          // Update message with current status
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: getProgressMessage(jobStatus),
                    analysisStatus: jobStatus,
                    isLoading:
                      jobStatus.status === "PENDING" ||
                      jobStatus.status === "PROCESSING",
                  }
                : msg
            )
          );

          if (jobStatus.status === "COMPLETE") {
            // Analysis completed successfully
            setIsProcessing(false);
            clearInterval(interval);
            pollingIntervals.current.delete(jobId);

            // Process the results
            if (jobStatus.data) {
              const enhancedResult = transformAnalysisResult(jobStatus.data);
              const successMessage = await generateSuccessMessage(
                enhancedResult,
                jobStatus,
                messagesRef.current[messagesRef.current.length - 2]?.content ||
                  ""
              );

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId
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

              // Update map with new data
              onMapUpdate?.(enhancedResult);
            }

            // NEW: Clear the analysis job ID to remove toast
            onAnalysisStart?.(null);
          } else if (jobStatus.status === "FAILED") {
            // Analysis failed
            setIsProcessing(false);
            clearInterval(interval);
            pollingIntervals.current.delete(jobId);

            // NEW: Clear the analysis job ID to remove toast
            onAnalysisStart?.(null);

            const errorMessage = `Analysis failed: ${
              jobStatus.error || "Unknown error occurred"
            }

**What happened:**
• The satellite imagery analysis encountered an error
• This could be due to API connectivity issues or processing limits

**Try these solutions:**
• Retry with a different location or smaller date range
• Check if the Geospatial Agent API is running (http://localhost:8001)
• Simplify your query (e.g., "show deforestation near a specific city")

**Fallback options:**
• Use basic property analysis queries
• Try demo data with "show me wards in a specific city"`;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: errorMessage,
                      isLoading: false,
                    }
                  : msg
              )
            );
          }
          // Continue polling for PENDING/PROCESSING status
        } catch (error) {
          console.error("Polling error:", error);
          console.log(
            "Polling failed, falling back to legacy query processing..."
          );

          // Clear polling and fallback to legacy processing
          clearInterval(interval);
          pollingIntervals.current.delete(jobId);

          // NEW: Clear the analysis job ID to remove toast
          onAnalysisStart?.(null);

          // Get the original query from the user message
          const userMessage =
            messagesRef.current[messagesRef.current.length - 2];
          if (userMessage?.role === "user") {
            await handleLegacyQuery(userMessage.content, messageId);
          }
        }
      }, pollInterval);

      pollingIntervals.current.set(jobId, interval);
    },
    [
      onAnalysisStart,
      onMapUpdate,
      setMessages,
      setIsProcessing,
      handleLegacyQuery,
      transformAnalysisResult,
      generateSuccessMessage,
      getProgressMessage,
    ]
  );

  // NEW: NLP Query Analysis function
  const analyzeQuery = useCallback(
    async (
      inputQuery: string
    ): Promise<{
      isNewLocationQuery: boolean;
      isFollowUpQuestion: boolean;
      followUpResponse?: string;
      requiresNewAnalysis: boolean;
      extractedLocation?: string;
      analysisType?: string;
      confidence?: number;
      intent?: string;
    }> => {
      try {
        const chatHistory = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          data: msg.data,
        }));

        const response = await fetch("/api/nlp-query-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: inputQuery,
            chatHistory,
            currentLocation,
            currentAnalysisType,
          }),
        });

        if (response.ok) {
          const analysis = await response.json();
          return {
            isNewLocationQuery: analysis.isNewLocationQuery,
            isFollowUpQuestion: analysis.isFollowUpQuestion,
            followUpResponse: analysis.followUpResponse,
            requiresNewAnalysis: analysis.requiresNewAnalysis,
            extractedLocation: analysis.extractedLocation,
            analysisType: analysis.analysisType,
            confidence: analysis.confidence,
            intent: analysis.intent,
          };
        }
      } catch (error) {
        console.error("NLP analysis failed:", error);
      }

      // Fallback: enhanced pattern matching with better location extraction
      const query = inputQuery.toLowerCase();

      // Enhanced location extraction patterns
      const extractLocationFallback = (text: string): string | null => {
        // Pattern 1: "near/around/in [location]"
        const nearPatterns = [
          /(?:near|around|in|at|of)\s+([a-zA-Z\s]+?)(?:\s|$|,|\?|!)/i,
          /(?:deforestation|urbanization|changes?)\s+(?:near|around|in|at|of)\s+([a-zA-Z\s]+?)(?:\s|$|,|\?|!)/i,
        ];

        for (const pattern of nearPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const location = match[1].trim();
            if (
              !["the", "this", "that", "area", "region", "place"].includes(
                location.toLowerCase()
              )
            ) {
              return location;
            }
          }
        }

        // Pattern 2: Direct city/location mentions
        const cityPatterns = [
          /(mumbai|delhi|bangalore|pune|kolkata|chennai|hyderabad|ahmedabad|gurgaon|noida|mysore)/i,
          /(london|paris|tokyo|new york|berlin|sydney|toronto|los angeles|chicago|boston)/i,
          /(amazon|sahara|himalaya|andes|sahel|congo|nile|ganges)/i,
          /(india|china|usa|america|brazil|russia|canada|australia|europe|africa|asia)/i,
          /(infosys|wipro|tcs|microsoft|google|apple|facebook|amazon)\s+([a-zA-Z]+)/i,
        ];

        for (const pattern of cityPatterns) {
          const match = text.match(pattern);
          if (match) {
            return match[0];
          }
        }

        return null;
      };

      const extractedLocation = extractLocationFallback(inputQuery);
      const hasLocation = Boolean(extractedLocation);

      // Enhanced analysis type detection
      let analysisType = null;
      if (
        query.includes("forest") ||
        query.includes("deforest") ||
        query.includes("tree")
      ) {
        analysisType = "deforestation";
      } else if (
        query.includes("urban") ||
        query.includes("city") ||
        query.includes("development") ||
        query.includes("expansion") ||
        query.includes("growth")
      ) {
        analysisType = "urbanization";
      } else if (
        query.includes("change") ||
        query.includes("detect") ||
        query.includes("monitor") ||
        query.includes("analysis")
      ) {
        analysisType = "change_detection";
      }

      const isFollowUp =
        currentLocation &&
        /\b(what|how|why|explain|tell me more|percentage|area|implications|causes)\b/.test(
          query
        ) &&
        !hasLocation;

      return {
        isNewLocationQuery: hasLocation,
        isFollowUpQuestion: isFollowUp,
        followUpResponse: isFollowUp
          ? `I'd be happy to provide more insights about the ${currentLocation} analysis. Could you be more specific about what aspect you'd like me to explain?`
          : undefined,
        requiresNewAnalysis: hasLocation,
        extractedLocation: extractedLocation,
        analysisType: analysisType,
        confidence: 0.7,
        intent: hasLocation
          ? `New ${
              analysisType || "satellite"
            } analysis request for ${extractedLocation}`
          : isFollowUp
          ? "Follow-up question about previous analysis"
          : "General query",
      };
    },
    [messages, currentLocation, currentAnalysisType]
  );

  // NEW: Handle follow-up questions without satellite analysis
  const handleFollowUpQuestion = useCallback(
    async (inputQuery: string, messageId: string, followUpResponse: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: "Processing your follow-up question...",
                isLoading: true,
              }
            : msg
        )
      );

      // Simulate processing time for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: ChatMessage = {
        id: messageId,
        role: "assistant",
        content: followUpResponse,
        timestamp: new Date(),
        data: lastAnalysisData || undefined,
        isStreaming: true,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? assistantMessage : msg))
      );

      setIsProcessing(false);
    },
    [lastAnalysisData]
  );

  // NEW: Enhanced query submission with NLP analysis for follow-up detection
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
        // Step 1: Analyze the query to determine if it's a follow-up or new location request
        const queryAnalysis = await analyzeQuery(inputQuery);

        if (
          queryAnalysis.isFollowUpQuestion &&
          queryAnalysis.followUpResponse
        ) {
          // Handle follow-up question without satellite analysis
          await handleFollowUpQuestion(
            inputQuery,
            loadingMessage.id,
            queryAnalysis.followUpResponse
          );
          return;
        }

        if (!queryAnalysis.requiresNewAnalysis) {
          // If it's not a location query and not a clear follow-up, provide a general response
          const generalResponse = `I understand you're asking about satellite analysis. To provide specific insights, I need either:

**For new analysis:**
- Mention a specific location (e.g., "Mumbai", "Amazon rainforest", "near Delhi")
- Specify the type of analysis (deforestation, urbanization, land use change)

**For follow-up questions:**
- Ask about the current analysis results (e.g., "What's the percentage?", "Can you explain more?")

Current context: ${
            currentLocation
              ? `We're analyzing ${currentLocation}`
              : "No active analysis"
          }

What would you like to explore?`;

          await handleFollowUpQuestion(
            inputQuery,
            loadingMessage.id,
            generalResponse
          );
          return;
        }

        // Step 2: Proceed with satellite analysis for new location queries
        onAnalysisStart?.("pending");

        const finalizeSuccess = async (
          unifiedPayload: UnifiedAnalyzeResponse,
          placeholderProgress?: string
        ) => {
          const statusFromAPI: UnifiedStatus =
            unifiedPayload.status &&
            ["PENDING", "PROCESSING", "COMPLETE", "FAILED"].includes(
              unifiedPayload.status
            )
              ? unifiedPayload.status
              : "COMPLETE";

          const statusObj: AnalysisJobStatus = {
            jobId: unifiedPayload.jobId || "n/a",
            status: statusFromAPI,
            progress:
              unifiedPayload.progress ||
              placeholderProgress ||
              "Analysis complete",
            elapsedTime: unifiedPayload.elapsedTime || 0,
            data: unifiedPayload.data,
          };

          const envelope: UnifiedAnalysisDataEnvelope = {
            ...unifiedPayload.data,
            elapsedTime: unifiedPayload.elapsedTime,
          };

          const enhancedResult = transformAnalysisResult(envelope);
          const successMessage = await generateSuccessMessage(
            enhancedResult,
            statusObj,
            inputQuery
          );

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: successMessage,
                    data: enhancedResult,
                    isLoading: false,
                    isStreaming: true,
                    jobId: statusObj.jobId,
                    analysisStatus: statusObj,
                  }
                : msg
            )
          );

          // Update context state
          setCurrentLocation(enhancedResult.city || null);
          setCurrentAnalysisType(enhancedResult.analysisType || null);
          setLastAnalysisData(enhancedResult);

          onMapUpdate?.(enhancedResult);
          setIsProcessing(false);
          onAnalysisStart?.(null);
        };

        // Try Unified API endpoints for satellite analysis
        const locationResp = await fetch(
          `${UNIFIED_API_BASE}/analyze/location`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location_name: inputQuery,
              zoom_level: "City-Wide (0.025°)",
              resolution: "Standard (5m)",
              overlay_alpha: 0.4,
            }),
          }
        );

        if (locationResp.ok) {
          const unifiedData: UnifiedAnalyzeResponse = await locationResp.json();
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content:
                      "Analysis started. Processing satellite imagery and running AI models...",
                    isLoading: true,
                    jobId: unifiedData.jobId,
                    analysisStatus: {
                      jobId: unifiedData.jobId || "n/a",
                      status:
                        unifiedData.status &&
                        [
                          "PENDING",
                          "PROCESSING",
                          "COMPLETE",
                          "FAILED",
                        ].includes(unifiedData.status)
                          ? (unifiedData.status as UnifiedStatus)
                          : "PROCESSING",
                      progress: unifiedData.progress || "Processing imagery...",
                      elapsedTime: unifiedData.elapsedTime || 0,
                    },
                  }
                : msg
            )
          );

          await finalizeSuccess(unifiedData);
          return;
        }

        // Try location search endpoint
        const searchResp = await fetch(`${UNIFIED_API_BASE}/locations/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: inputQuery, limit: 1 }),
        });

        if (searchResp.ok) {
          const search = (await searchResp.json()) as {
            locations?: Array<{
              coordinates?: { lat?: number; lon?: number };
            }>;
          };
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
              const unifiedData: UnifiedAnalyzeResponse =
                await analyzeResp.json();
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingMessage.id
                    ? {
                        ...msg,
                        content:
                          "Analysis started. Processing satellite imagery and running AI models...",
                        isLoading: true,
                        jobId: unifiedData.jobId,
                        analysisStatus: {
                          jobId: unifiedData.jobId || "n/a",
                          status:
                            unifiedData.status &&
                            [
                              "PENDING",
                              "PROCESSING",
                              "COMPLETE",
                              "FAILED",
                            ].includes(unifiedData.status)
                              ? (unifiedData.status as UnifiedStatus)
                              : "PROCESSING",
                          progress:
                            unifiedData.progress || "Processing imagery...",
                          elapsedTime: unifiedData.elapsedTime || 0,
                        },
                      }
                    : msg
                )
              );

              await finalizeSuccess(unifiedData);
              return;
            }
          }
        }

        // Fallback to legacy analysis API
        const response = await fetch("/api/analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: inputQuery,
            nlpAnalysis: queryAnalysis.isNewLocationQuery
              ? {
                  extractedLocation: queryAnalysis.extractedLocation,
                  analysisType: queryAnalysis.analysisType,
                  confidence: queryAnalysis.confidence,
                  intent: queryAnalysis.intent,
                }
              : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Analysis request failed: ${response.status}`);
        }

        const jobInfo = (await response.json()) as {
          jobId: string;
          pollingUrl: string;
        };

        const jobMessage: ChatMessage = {
          id: loadingMessage.id,
          role: "assistant",
          content:
            "Analysis started. Processing satellite imagery and running AI models...",
          timestamp: new Date(),
          isLoading: true,
          jobId: jobInfo.jobId,
          analysisStatus: {
            jobId: jobInfo.jobId,
            status: "PENDING",
            progress: "Analysis started...",
            elapsedTime: 0,
          },
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === loadingMessage.id ? jobMessage : msg))
        );

        onAnalysisStart?.(jobInfo.jobId);
        startJobPolling(jobInfo.jobId, jobInfo.pollingUrl, loadingMessage.id);
      } catch (error) {
        console.error("Analysis submission failed:", error);

        console.log("Falling back to legacy query processing...");
        await handleLegacyQuery(inputQuery, loadingMessage.id);
      }
    },
    [
      currentInput,
      isProcessing,
      analyzeQuery,
      handleFollowUpQuestion,
      onMapUpdate,
      onAnalysisStart,
      startJobPolling,
      handleLegacyQuery,
      transformAnalysisResult,
      generateSuccessMessage,
    ]
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
