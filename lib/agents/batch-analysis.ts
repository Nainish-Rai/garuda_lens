import {
  ChangeDetectionAgent,
  ChangeDetectionResult,
} from "./change-detection";
import { DeforestationAgent, DeforestationResult } from "./deforestation";
import { UrbanizationAgent, UrbanizationResult } from "./urbanization";

export interface BatchLocation {
  name: string;
  coordinates: [number, number];
  priority?: "low" | "medium" | "high" | "critical";
}

export interface BatchAnalysisResult {
  batchId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  locations: BatchLocation[];
  results: {
    locationName: string;
    coordinates: [number, number];
    analysisType: "change_detection" | "deforestation" | "urbanization";
    result: ChangeDetectionResult | DeforestationResult | UrbanizationResult;
    processingTime: number;
    error?: string;
  }[];
  aggregatedResults: {
    totalAreaAnalyzed: number;
    totalChangesDetected: number;
    averageChangePercentage: number;
    comparativeStatistics: {
      mostChangedLocation: string;
      leastChangedLocation: string;
      highestRiskLocation: string;
      trends: {
        increasing: string[];
        decreasing: string[];
        stable: string[];
      };
    };
    regionalSummary: string;
  };
  metadata: {
    analysisType: "change_detection" | "deforestation" | "urbanization";
    dateRange: [string, string];
    totalProcessingTime: number;
    successRate: number;
    createdAt: string;
    completedAt?: string;
  };
}

export class BatchAnalysisAgent {
  private static activeBatches = new Map<string, BatchAnalysisResult>();

  /**
   * Initiates batch analysis for multiple locations
   */
  static async analyzeBatch(
    locations: BatchLocation[],
    analysisType:
      | "change_detection"
      | "deforestation"
      | "urbanization" = "change_detection",
    dateRange?: [string, string]
  ): Promise<{ batchId: string; pollingUrl: string }> {
    const batchId = this.generateBatchId();

    // Initialize batch record
    const batchResult: BatchAnalysisResult = {
      batchId,
      status: "PENDING",
      locations,
      results: [],
      aggregatedResults: {
        totalAreaAnalyzed: 0,
        totalChangesDetected: 0,
        averageChangePercentage: 0,
        comparativeStatistics: {
          mostChangedLocation: "",
          leastChangedLocation: "",
          highestRiskLocation: "",
          trends: { increasing: [], decreasing: [], stable: [] },
        },
        regionalSummary: "",
      },
      metadata: {
        analysisType,
        dateRange: dateRange || ["2020-01-01", "2024-12-31"],
        totalProcessingTime: 0,
        successRate: 0,
        createdAt: new Date().toISOString(),
      },
    };

    this.activeBatches.set(batchId, batchResult);

    // Start background processing
    this.processBatchAsync(batchId, locations, analysisType, dateRange);

    return {
      batchId,
      pollingUrl: `/api/analysis/batch/${batchId}`,
    };
  }

  /**
   * Gets the status of a batch analysis
   */
  static getBatchStatus(batchId: string): BatchAnalysisResult | null {
    return this.activeBatches.get(batchId) || null;
  }

  /**
   * Processes batch analysis asynchronously
   */
  private static async processBatchAsync(
    batchId: string,
    locations: BatchLocation[],
    analysisType: "change_detection" | "deforestation" | "urbanization",
    dateRange?: [string, string]
  ): Promise<void> {
    const batch = this.activeBatches.get(batchId);
    if (!batch) return;

    const startTime = Date.now();

    try {
      batch.status = "PROCESSING";
      this.activeBatches.set(batchId, batch);

      // Sort locations by priority
      const sortedLocations = this.sortLocationsByPriority(locations);

      // Process each location
      for (let i = 0; i < sortedLocations.length; i++) {
        const location = sortedLocations[i];
        const locationStartTime = Date.now();

        try {
          // Update progress
          batch.status = "PROCESSING";
          this.activeBatches.set(batchId, batch);

          // Perform analysis based on type
          let result:
            | ChangeDetectionResult
            | DeforestationResult
            | UrbanizationResult;

          switch (analysisType) {
            case "deforestation":
              result = await DeforestationAgent.analyze(
                location.name,
                dateRange,
                location.coordinates
              );
              break;
            case "urbanization":
              result = await UrbanizationAgent.analyze(
                location.name,
                dateRange,
                location.coordinates
              );
              break;
            default:
              result = await ChangeDetectionAgent.analyze(
                location.name,
                dateRange,
                location.coordinates
              );
          }

          const processingTime = Date.now() - locationStartTime;

          // Add successful result
          batch.results.push({
            locationName: location.name,
            coordinates: location.coordinates,
            analysisType,
            result,
            processingTime,
          });
        } catch (error) {
          console.error(
            `Analysis failed for location ${location.name}:`,
            error
          );

          // Add failed result
          batch.results.push({
            locationName: location.name,
            coordinates: location.coordinates,
            analysisType,
            result: this.createEmptyResult(),
            processingTime: Date.now() - locationStartTime,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        // Update batch with current progress
        this.activeBatches.set(batchId, batch);
      }

      // Generate aggregated results
      batch.aggregatedResults = this.generateAggregatedResults(batch.results);

      // Mark as complete
      batch.status = "COMPLETE";
      batch.metadata.totalProcessingTime = Date.now() - startTime;
      batch.metadata.completedAt = new Date().toISOString();
      batch.metadata.successRate = this.calculateSuccessRate(batch.results);

      this.activeBatches.set(batchId, batch);
    } catch (error) {
      console.error(`Batch analysis failed for batch ${batchId}:`, error);

      batch.status = "FAILED";
      batch.metadata.totalProcessingTime = Date.now() - startTime;
      this.activeBatches.set(batchId, batch);
    }
  }

  /**
   * Generates aggregated analysis results from individual location results
   */
  private static generateAggregatedResults(
    results: BatchAnalysisResult["results"]
  ): BatchAnalysisResult["aggregatedResults"] {
    const successfulResults = results.filter((r) => !r.error);

    if (successfulResults.length === 0) {
      return {
        totalAreaAnalyzed: 0,
        totalChangesDetected: 0,
        averageChangePercentage: 0,
        comparativeStatistics: {
          mostChangedLocation: "N/A",
          leastChangedLocation: "N/A",
          highestRiskLocation: "N/A",
          trends: { increasing: [], decreasing: [], stable: [] },
        },
        regionalSummary: "No successful analyses to aggregate.",
      };
    }

    // Calculate totals
    const totalAreaAnalyzed = successfulResults.reduce(
      (sum, r) => sum + r.result.statistics.totalChangeArea,
      0
    );

    const totalChangesDetected = successfulResults.reduce(
      (sum, r) => sum + r.result.statistics.changedPixels,
      0
    );

    const averageChangePercentage =
      successfulResults.reduce(
        (sum, r) => sum + r.result.statistics.changePercentage,
        0
      ) / successfulResults.length;

    // Comparative analysis
    const comparativeStats =
      this.generateComparativeStatistics(successfulResults);

    // Regional summary
    const regionalSummary = this.generateRegionalSummary(
      successfulResults,
      comparativeStats
    );

    return {
      totalAreaAnalyzed,
      totalChangesDetected,
      averageChangePercentage,
      comparativeStatistics: comparativeStats,
      regionalSummary,
    };
  }

  /**
   * Generates comparative statistics across locations
   */
  private static generateComparativeStatistics(
    results: Array<{
      locationName: string;
      result: ChangeDetectionResult | DeforestationResult | UrbanizationResult;
    }>
  ): BatchAnalysisResult["aggregatedResults"]["comparativeStatistics"] {
    // Find most and least changed locations
    const changePercentages = results.map((r) => ({
      name: r.locationName,
      change: r.result.statistics.changePercentage,
    }));

    const mostChanged = changePercentages.reduce((max, current) =>
      current.change > max.change ? current : max
    );

    const leastChanged = changePercentages.reduce((min, current) =>
      current.change < min.change ? current : min
    );

    // Find highest risk location (simplified)
    const highestRisk = results.reduce((max, current) =>
      current.result.statistics.changePercentage >
      max.result.statistics.changePercentage
        ? current
        : max
    );

    // Analyze trends
    const trends = this.analyzeTrends(results);

    return {
      mostChangedLocation: mostChanged.name,
      leastChangedLocation: leastChanged.name,
      highestRiskLocation: highestRisk.locationName,
      trends,
    };
  }

  /**
   * Analyzes trends across locations
   */
  private static analyzeTrends(
    results: Array<{
      locationName: string;
      result: ChangeDetectionResult | DeforestationResult | UrbanizationResult;
    }>
  ): { increasing: string[]; decreasing: string[]; stable: string[] } {
    const increasing: string[] = [];
    const decreasing: string[] = [];
    const stable: string[] = [];

    results.forEach((r) => {
      const changePercent = r.result.statistics.changePercentage;

      if (changePercent > 10) {
        increasing.push(r.locationName);
      } else if (changePercent < 2) {
        stable.push(r.locationName);
      } else {
        decreasing.push(r.locationName);
      }
    });

    return { increasing, decreasing, stable };
  }

  /**
   * Generates a comprehensive regional summary
   */
  private static generateRegionalSummary(
    results: Array<{
      locationName: string;
      result: ChangeDetectionResult | DeforestationResult | UrbanizationResult;
    }>,
    comparativeStats: BatchAnalysisResult["aggregatedResults"]["comparativeStatistics"]
  ): string {
    const locationCount = results.length;
    const avgChange =
      results.reduce(
        (sum, r) => sum + r.result.statistics.changePercentage,
        0
      ) / locationCount;

    const summary = `Regional analysis of ${locationCount} locations reveals an average change rate of ${avgChange.toFixed(
      1
    )}%. ${
      comparativeStats.mostChangedLocation
    } shows the highest activity (${results
      .find((r) => r.locationName === comparativeStats.mostChangedLocation)
      ?.result.statistics.changePercentage.toFixed(1)}%), while ${
      comparativeStats.leastChangedLocation
    } remains most stable (${results
      .find((r) => r.locationName === comparativeStats.leastChangedLocation)
      ?.result.statistics.changePercentage.toFixed(1)}%). `;

    const trendSummary = `Trend analysis indicates ${comparativeStats.trends.increasing.length} locations with increasing activity, ${comparativeStats.trends.stable.length} stable areas, and ${comparativeStats.trends.decreasing.length} areas with decreasing activity.`;

    return summary + trendSummary;
  }

  /**
   * Helper methods
   */
  private static generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private static sortLocationsByPriority(
    locations: BatchLocation[]
  ): BatchLocation[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    return [...locations].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || "medium"];
      const bPriority = priorityOrder[b.priority || "medium"];
      return bPriority - aPriority;
    });
  }

  private static createEmptyResult(): ChangeDetectionResult {
    return {
      changePolygons: { type: "FeatureCollection", features: [] },
      statistics: {
        totalChangeArea: 0,
        changePercentage: 0,
        changedPixels: 0,
        totalPixels: 0,
      },
      images: {
        beforeImage: "",
        afterImage: "",
        overlayImage: "",
        maskImage: "",
      },
      metadata: {
        location: "Unknown",
        dateRange: ["2020-01-01", "2024-12-31"],
        resolution: "10m",
        algorithm: "N/A",
        analysisDate: new Date().toISOString(),
      },
    };
  }

  private static calculateSuccessRate(
    results: BatchAnalysisResult["results"]
  ): number {
    const successfulCount = results.filter((r) => !r.error).length;
    return results.length > 0 ? (successfulCount / results.length) * 100 : 0;
  }

  /**
   * Cleanup completed batches (call periodically)
   */
  static cleanupCompletedBatches(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();

    for (const [batchId, batch] of this.activeBatches.entries()) {
      const batchAge = now - new Date(batch.metadata.createdAt).getTime();

      if (
        (batch.status === "COMPLETE" || batch.status === "FAILED") &&
        batchAge > maxAge
      ) {
        this.activeBatches.delete(batchId);
      }
    }
  }
}
