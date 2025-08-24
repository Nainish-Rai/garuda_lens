import {
  ChangeDetectionAgent,
  ChangeDetectionResult,
} from "./change-detection";
import { fetchGeospatialAnalysis } from "@/lib/data-fetchers";
import type { GeospatialAnalysisRequest } from "@/lib/data-fetchers";

export interface DeforestationResult extends ChangeDetectionResult {
  forestLoss: {
    deforestedArea: number;
    forestLossPercentage: number;
    deforestedPolygons: GeoJSON.FeatureCollection;
  };
  forestStats: {
    originalForestArea: number;
    remainingForestArea: number;
    treeCoverLoss: number;
    averageTreeDensityChange: number;
  };
}

export class DeforestationAgent {
  /**
   * Analyzes deforestation patterns by extending change detection for forest-specific analysis
   */
  static async analyze(
    location: string,
    dateRange?: [string, string],
    coordinates?: [number, number]
  ): Promise<DeforestationResult> {
    try {
      // First, get general change detection results
      const changeResult = await ChangeDetectionAgent.analyze(
        location,
        dateRange,
        coordinates
      );

      // Perform forest-specific analysis
      const request: GeospatialAnalysisRequest = {
        location: coordinates ? undefined : location,
        coordinates: coordinates,
        dateRange: dateRange || ["2020-01-01", "2024-12-31"],
        analysisType: "deforestation",
      };

      const forestAnalysis = await fetchGeospatialAnalysis(request);

      if (forestAnalysis.status === "error") {
        console.warn(
          "Forest-specific analysis failed, using change detection results"
        );
      }

      // Apply forest-specific filters to change detection results
      const deforestedPolygons = this.filterForestChanges(
        changeResult.changePolygons
      );

      // Calculate forest loss statistics
      const forestStats = this.calculateForestStats(
        changeResult,
        deforestedPolygons,
        forestAnalysis.data
          ? { treeDensityChange: forestAnalysis.data.changePercentage }
          : undefined
      );

      const forestLoss = this.calculateForestLoss(
        deforestedPolygons,
        forestStats
      );

      return {
        ...changeResult,
        forestLoss,
        forestStats,
      };
    } catch (error) {
      console.error("Deforestation analysis failed:", error);
      throw new Error(
        `Deforestation analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Filters change detection results to identify forest-specific changes
   */
  private static filterForestChanges(
    changePolygons: GeoJSON.FeatureCollection
  ): GeoJSON.FeatureCollection {
    // Filter polygons that represent forest loss
    const forestChanges = changePolygons.features.filter((feature) => {
      // In a real implementation, this would use vegetation indices and land cover classification
      // For now, we'll assume all detected changes in forested areas represent potential deforestation
      return feature.properties?.changeType === "land_use_change";
    });

    // Enhance properties with forest-specific metadata
    const enhancedFeatures = forestChanges.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        changeType: "deforestation",
        forestType: this.classifyForestType(feature),
        severity: this.calculateDeforestationSeverity(feature),
        causeLikelihood: this.estimateDeforestationCause(feature),
      },
    }));

    return {
      type: "FeatureCollection",
      features: enhancedFeatures,
    };
  }

  /**
   * Calculates comprehensive forest statistics
   */
  private static calculateForestStats(
    changeResult: ChangeDetectionResult,
    deforestedPolygons: GeoJSON.FeatureCollection,
    forestAnalysisData?: { treeDensityChange?: number }
  ): DeforestationResult["forestStats"] {
    const totalArea = changeResult.statistics.totalChangeArea;
    const deforestedArea = deforestedPolygons.features.reduce(
      (sum, feature) => {
        return sum + (feature.properties?.area || 0);
      },
      0
    );

    // Estimate original forest coverage (would come from satellite data in real implementation)
    const estimatedOriginalForestArea = totalArea * 0.7; // Assume 70% forest coverage initially
    const remainingForestArea = estimatedOriginalForestArea - deforestedArea;

    // Calculate tree cover loss metrics
    const treeCoverLoss = deforestedArea;
    const averageTreeDensityChange =
      forestAnalysisData?.treeDensityChange || -25; // Default estimate

    return {
      originalForestArea: estimatedOriginalForestArea,
      remainingForestArea: Math.max(0, remainingForestArea),
      treeCoverLoss,
      averageTreeDensityChange,
    };
  }

  /**
   * Calculates forest loss metrics
   */
  private static calculateForestLoss(
    deforestedPolygons: GeoJSON.FeatureCollection,
    forestStats: DeforestationResult["forestStats"]
  ): DeforestationResult["forestLoss"] {
    const deforestedArea = deforestedPolygons.features.reduce(
      (sum, feature) => {
        return sum + (feature.properties?.area || 0);
      },
      0
    );

    const forestLossPercentage =
      forestStats.originalForestArea > 0
        ? (deforestedArea / forestStats.originalForestArea) * 100
        : 0;

    return {
      deforestedArea,
      forestLossPercentage,
      deforestedPolygons,
    };
  }

  /**
   * Classifies the type of forest based on location and characteristics
   */
  private static classifyForestType(feature: GeoJSON.Feature): string {
    // In a real implementation, this would use vegetation indices and regional data
    const area = feature.properties?.area || 0;

    if (area > 100000) {
      // Large areas
      return "primary_forest";
    } else if (area > 10000) {
      return "secondary_forest";
    } else {
      return "woodland";
    }
  }

  /**
   * Calculates deforestation severity based on area and pattern
   */
  private static calculateDeforestationSeverity(
    feature: GeoJSON.Feature
  ): "low" | "moderate" | "high" | "severe" {
    const area = feature.properties?.area || 0;
    const confidence = feature.properties?.confidence || 0;

    if (area > 50000 && confidence > 0.8) {
      return "severe";
    } else if (area > 20000 && confidence > 0.7) {
      return "high";
    } else if (area > 5000 && confidence > 0.6) {
      return "moderate";
    } else {
      return "low";
    }
  }

  /**
   * Estimates the likely cause of deforestation based on pattern analysis
   */
  private static estimateDeforestationCause(feature: GeoJSON.Feature): {
    primaryCause: string;
    confidence: number;
    factors: string[];
  } {
    const area = feature.properties?.area || 0;

    // Pattern-based cause estimation (simplified)
    if (area > 100000) {
      return {
        primaryCause: "large_scale_agriculture",
        confidence: 0.7,
        factors: ["commercial_farming", "cattle_ranching"],
      };
    } else if (area > 10000) {
      return {
        primaryCause: "infrastructure_development",
        confidence: 0.6,
        factors: ["road_construction", "urban_expansion"],
      };
    } else {
      return {
        primaryCause: "small_scale_clearing",
        confidence: 0.5,
        factors: ["subsistence_farming", "logging"],
      };
    }
  }

  /**
   * Generates a comprehensive deforestation assessment report
   */
  static generateAssessmentReport(result: DeforestationResult): {
    summary: string;
    impact: string;
    recommendations: string[];
    urgency: "low" | "moderate" | "high" | "critical";
  } {
    const { forestLoss, forestStats } = result;

    let urgency: "low" | "moderate" | "high" | "critical" = "low";
    if (forestLoss.forestLossPercentage > 20) urgency = "critical";
    else if (forestLoss.forestLossPercentage > 10) urgency = "high";
    else if (forestLoss.forestLossPercentage > 5) urgency = "moderate";

    const summary = `Deforestation analysis reveals ${forestLoss.forestLossPercentage.toFixed(
      1
    )}% forest loss (${(forestLoss.deforestedArea / 10000).toFixed(
      1
    )} hectares) in the analyzed area. ${
      forestStats.remainingForestArea > 0
        ? `${(forestStats.remainingForestArea / 10000).toFixed(
            1
          )} hectares of forest remain.`
        : "Critical forest loss detected."
    }`;

    const impact = `Environmental impact includes loss of ${forestStats.treeCoverLoss.toFixed(
      0
    )} square meters of tree cover, representing a ${Math.abs(
      forestStats.averageTreeDensityChange
    )}% reduction in tree density. This affects local biodiversity, carbon sequestration, and ecosystem services.`;

    const recommendations = [
      "Implement immediate forest protection measures in remaining areas",
      "Establish monitoring systems for early deforestation detection",
      "Consider reforestation programs in suitable cleared areas",
      "Investigate and address root causes of deforestation",
      "Engage local communities in conservation efforts",
    ];

    if (urgency === "critical") {
      recommendations.unshift(
        "URGENT: Deploy emergency conservation response team"
      );
    }

    return {
      summary,
      impact,
      recommendations,
      urgency,
    };
  }
}
