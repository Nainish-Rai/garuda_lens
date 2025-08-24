import {
  ChangeDetectionAgent,
  ChangeDetectionResult,
} from "./change-detection";
import {
  fetchGeospatialAnalysis,
  fetchPopulationData,
} from "@/lib/data-fetchers";
import type { GeospatialAnalysisRequest } from "@/lib/data-fetchers";

export interface UrbanizationResult extends ChangeDetectionResult {
  urbanGrowth: {
    newUrbanAreas: GeoJSON.FeatureCollection;
    urbanExpansionRate: number;
    totalUrbanGrowth: number;
    developmentDensity: number;
  };
  populationImpact: {
    estimatedNewPopulation: number;
    populationDensity: number;
    displacedPopulation: number;
    demographicChanges: {
      totalAffected: number;
      housingUnitsAdded: number;
      infrastructureScore: number;
    };
  };
  developmentPatterns: {
    developmentType: "residential" | "commercial" | "industrial" | "mixed";
    sprawlPattern: "compact" | "scattered" | "linear" | "radial";
    sustainabilityScore: number;
    greenSpaceImpact: number;
  };
}

export class UrbanizationAgent {
  /**
   * Analyzes urban development patterns and population impact
   */
  static async analyze(
    location: string,
    dateRange?: [string, string],
    coordinates?: [number, number]
  ): Promise<UrbanizationResult> {
    try {
      // Get base change detection results
      const changeResult = await ChangeDetectionAgent.analyze(
        location,
        dateRange,
        coordinates
      );

      // Perform urbanization-specific analysis
      const request: GeospatialAnalysisRequest = {
        location: coordinates ? undefined : location,
        coordinates: coordinates,
        dateRange: dateRange || ["2020-01-01", "2024-12-31"],
        analysisType: "urbanization",
      };

      const urbanAnalysis = await fetchGeospatialAnalysis(request);

      // Filter changes to focus on urban development patterns
      const newUrbanAreas = this.identifyUrbanDevelopment(
        changeResult.changePolygons
      );

      // Calculate urban growth metrics
      const urbanGrowth = this.calculateUrbanGrowth(
        newUrbanAreas,
        changeResult
      );

      // Estimate population impact
      const populationImpact = await this.calculatePopulationImpact(
        newUrbanAreas
      );

      // Analyze development patterns
      const developmentPatterns = this.analyzeDevelopmentPatterns(
        newUrbanAreas,
        urbanAnalysis.data
          ? {
              infrastructureEfficiency:
                urbanAnalysis.data.changePercentage / 100,
            }
          : undefined
      );

      return {
        ...changeResult,
        urbanGrowth,
        populationImpact,
        developmentPatterns,
      };
    } catch (error) {
      console.error("Urbanization analysis failed:", error);
      throw new Error(
        `Urbanization analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Filters change detection results to identify urban development
   */
  private static identifyUrbanDevelopment(
    changePolygons: GeoJSON.FeatureCollection
  ): GeoJSON.FeatureCollection {
    // Filter and classify changes that represent urban development
    const urbanChanges = changePolygons.features
      .filter((feature) => this.isUrbanDevelopment(feature))
      .map((feature) => this.enhanceUrbanFeature(feature));

    return {
      type: "FeatureCollection",
      features: urbanChanges,
    };
  }

  /**
   * Determines if a change represents urban development
   */
  private static isUrbanDevelopment(feature: GeoJSON.Feature): boolean {
    const area = feature.properties?.area || 0;
    const confidence = feature.properties?.confidence || 0;

    // Urban development criteria: moderate to large areas with high confidence
    return area > 1000 && confidence > 0.6; // At least 1000 sq meters
  }

  /**
   * Enhances features with urban development metadata
   */
  private static enhanceUrbanFeature(
    feature: GeoJSON.Feature
  ): GeoJSON.Feature {
    const area = feature.properties?.area || 0;

    return {
      ...feature,
      properties: {
        ...feature.properties,
        changeType: "urban_development",
        developmentType: this.classifyDevelopmentType(area),
        buildingDensity: this.estimateBuildingDensity(area),
        infrastructureNeeds: this.assessInfrastructureNeeds(area),
        environmentalImpact: this.assessEnvironmentalImpact(area),
      },
    };
  }

  /**
   * Calculates urban growth statistics
   */
  private static calculateUrbanGrowth(
    newUrbanAreas: GeoJSON.FeatureCollection,
    changeResult: ChangeDetectionResult
  ): UrbanizationResult["urbanGrowth"] {
    const totalUrbanGrowth = newUrbanAreas.features.reduce((sum, feature) => {
      return sum + (feature.properties?.area || 0);
    }, 0);

    const timeSpanYears = this.calculateTimeSpan(
      changeResult.metadata.dateRange
    );
    const urbanExpansionRate = totalUrbanGrowth / timeSpanYears; // sq meters per year

    const developmentDensity =
      newUrbanAreas.features.length > 0
        ? totalUrbanGrowth / newUrbanAreas.features.length
        : 0;

    return {
      newUrbanAreas,
      urbanExpansionRate,
      totalUrbanGrowth,
      developmentDensity,
    };
  }

  /**
   * Calculates population impact of urban development
   */
  private static async calculatePopulationImpact(
    newUrbanAreas: GeoJSON.FeatureCollection
  ): Promise<UrbanizationResult["populationImpact"]> {
    let totalEstimatedPopulation = 0;
    let totalAffected = 0;

    // Calculate population impact for each new urban area
    for (const feature of newUrbanAreas.features) {
      try {
        if (feature.geometry.type === "Polygon") {
          const polygon: GeoJSON.Polygon = feature.geometry;
          const populationData = await fetchPopulationData(polygon);

          totalEstimatedPopulation += populationData.estimatedPopulation;
          totalAffected += populationData.estimatedPopulation;
        }
      } catch {
        console.warn(
          "Population data fetch failed for feature, using estimates"
        );
        // Fallback estimation: ~100 people per hectare for urban development
        const area = feature.properties?.area || 0;
        const estimatedPop = (area / 10000) * 100; // Convert to hectares, then estimate
        totalEstimatedPopulation += estimatedPop;
        totalAffected += estimatedPop;
      }
    }

    const totalUrbanArea = newUrbanAreas.features.reduce((sum, feature) => {
      return sum + (feature.properties?.area || 0);
    }, 0);

    const populationDensity =
      totalUrbanArea > 0
        ? totalEstimatedPopulation / (totalUrbanArea / 1000000) // per sq km
        : 0;

    // Estimate displaced population (typically 10-20% in urban development)
    const displacedPopulation = totalEstimatedPopulation * 0.15;

    // Estimate housing units (average 2.5 people per unit)
    const housingUnitsAdded = Math.round(totalEstimatedPopulation / 2.5);

    // Infrastructure score (0-100, based on development density and area)
    const infrastructureScore = Math.min(
      100,
      Math.round(
        (totalUrbanArea / 100000) * 30 + (populationDensity / 1000) * 20 + 50
      )
    );

    return {
      estimatedNewPopulation: Math.round(totalEstimatedPopulation),
      populationDensity: Math.round(populationDensity),
      displacedPopulation: Math.round(displacedPopulation),
      demographicChanges: {
        totalAffected: Math.round(totalAffected),
        housingUnitsAdded,
        infrastructureScore,
      },
    };
  }

  /**
   * Analyzes development patterns and sustainability
   */
  private static analyzeDevelopmentPatterns(
    newUrbanAreas: GeoJSON.FeatureCollection,
    urbanAnalysisData?: { infrastructureEfficiency?: number }
  ): UrbanizationResult["developmentPatterns"] {
    const features = newUrbanAreas.features;

    // Determine dominant development type
    const developmentType = this.getDominantDevelopmentType(features);

    // Analyze spatial pattern
    const sprawlPattern = this.analyzeSprawlPattern(features);

    // Calculate sustainability score
    const sustainabilityScore = this.calculateSustainabilityScore(
      features,
      urbanAnalysisData
    );

    // Assess green space impact
    const greenSpaceImpact = this.assessGreenSpaceImpact(features);

    return {
      developmentType,
      sprawlPattern,
      sustainabilityScore,
      greenSpaceImpact,
    };
  }

  /**
   * Helper methods for classification and analysis
   */
  private static classifyDevelopmentType(
    area: number
  ): "residential" | "commercial" | "industrial" | "mixed" {
    if (area < 5000) return "residential";
    if (area < 20000) return "commercial";
    if (area < 100000) return "mixed";
    return "industrial";
  }

  private static estimateBuildingDensity(
    area: number
  ): "low" | "medium" | "high" {
    if (area < 10000) return "high";
    if (area < 50000) return "medium";
    return "low";
  }

  private static assessInfrastructureNeeds(area: number): string[] {
    const needs = ["water_supply", "electricity"];
    if (area > 10000) needs.push("sewerage", "transportation");
    if (area > 50000)
      needs.push("healthcare", "education", "emergency_services");
    return needs;
  }

  private static assessEnvironmentalImpact(
    area: number
  ): "low" | "moderate" | "high" | "severe" {
    if (area < 5000) return "low";
    if (area < 20000) return "moderate";
    if (area < 100000) return "high";
    return "severe";
  }

  private static calculateTimeSpan(dateRange: [string, string]): number {
    const start = new Date(dateRange[0]);
    const end = new Date(dateRange[1]);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }

  private static getDominantDevelopmentType(
    features: GeoJSON.Feature[]
  ): "residential" | "commercial" | "industrial" | "mixed" {
    const types = features.map(
      (f) => f.properties?.developmentType || "residential"
    );
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).reduce((a, b) =>
      typeCounts[a[0]] > typeCounts[b[0]] ? a : b
    )[0] as "residential" | "commercial" | "industrial" | "mixed";
  }

  private static analyzeSprawlPattern(
    features: GeoJSON.Feature[]
  ): "compact" | "scattered" | "linear" | "radial" {
    if (features.length < 2) return "compact";

    // Simplified pattern analysis based on feature distribution
    const totalArea = features.reduce(
      (sum, f) => sum + (f.properties?.area || 0),
      0
    );
    const avgFeatureSize = totalArea / features.length;

    if (avgFeatureSize > 50000) return "scattered";
    if (features.length > 10) return "radial";
    if (features.length > 5) return "linear";
    return "compact";
  }

  private static calculateSustainabilityScore(
    features: GeoJSON.Feature[],
    urbanAnalysisData?: { infrastructureEfficiency?: number }
  ): number {
    let score = 50; // Base score

    // Density bonus (compact development is more sustainable)
    const avgDensity =
      features.filter((f) => f.properties?.buildingDensity === "high").length /
      features.length;
    score += avgDensity * 20;

    // Environmental impact penalty
    const highImpactCount = features.filter(
      (f) => f.properties?.environmentalImpact === "severe"
    ).length;
    score -= (highImpactCount / features.length) * 30;

    // Infrastructure efficiency
    if (urbanAnalysisData?.infrastructureEfficiency) {
      score += urbanAnalysisData.infrastructureEfficiency * 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private static assessGreenSpaceImpact(features: GeoJSON.Feature[]): number {
    // Assume urban development typically reduces green space by 60-80%
    const baseImpact = 70; // 70% green space loss

    // Adjust based on development type
    const residentialCount = features.filter(
      (f) => f.properties?.developmentType === "residential"
    ).length;
    const industrialCount = features.filter(
      (f) => f.properties?.developmentType === "industrial"
    ).length;

    let adjustedImpact = baseImpact;
    adjustedImpact -= (residentialCount / features.length) * 10; // Residential typically preserves more green space
    adjustedImpact += (industrialCount / features.length) * 15; // Industrial typically removes more

    return Math.max(0, Math.min(100, Math.round(adjustedImpact)));
  }
}
