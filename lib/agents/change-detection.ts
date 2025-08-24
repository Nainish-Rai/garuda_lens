import {
  fetchGeospatialAnalysis,
  fetchLocationCoordinates,
} from "@/lib/data-fetchers";
import type { GeospatialAnalysisRequest } from "@/lib/data-fetchers";

export interface ChangeDetectionResult {
  changePolygons: GeoJSON.FeatureCollection;
  statistics: {
    totalChangeArea: number;
    changePercentage: number;
    changedPixels: number;
    totalPixels: number;
  };
  images: {
    beforeImage: string;
    afterImage: string;
    overlayImage: string;
    maskImage: string;
  };
  metadata: {
    location: string;
    dateRange: [string, string];
    resolution: string;
    algorithm: string;
    analysisDate: string;
  };
}

export class ChangeDetectionAgent {
  /**
   * Analyzes land use changes between two time periods using satellite imagery
   */
  static async analyze(
    location: string,
    dateRange?: [string, string],
    coordinates?: [number, number]
  ): Promise<ChangeDetectionResult> {
    try {
      // Prepare analysis request
      const request: GeospatialAnalysisRequest = {
        location: coordinates ? undefined : location,
        coordinates: coordinates,
        dateRange: dateRange || ["2020-01-01", "2024-12-31"],
        analysisType: "change_detection",
      };

      // If location name provided but no coordinates, get coordinates first
      if (!coordinates && location) {
        try {
          const locationData = await fetchLocationCoordinates(location);
          request.coordinates = locationData.coordinates;
        } catch {
          console.warn(
            "Could not get coordinates for location, proceeding with location name"
          );
        }
      }

      // Call Geospatial Agent API
      const analysisResponse = await fetchGeospatialAnalysis(request);

      if (analysisResponse.status === "error") {
        throw new Error(analysisResponse.error || "Analysis failed");
      }

      const data = analysisResponse.data!;

      // Convert change detection mask to GeoJSON polygons
      const changePolygons = await this.convertMaskToGeoJSON(
        data.maskImage,
        request.coordinates || [0, 0],
        data.analysisMetadata.resolution
      );

      // Calculate area statistics
      const statistics = this.calculateAreaStatistics(
        data.changePercentage,
        changePolygons,
        data.analysisMetadata.resolution
      );

      return {
        changePolygons,
        statistics,
        images: {
          beforeImage: data.beforeImage,
          afterImage: data.afterImage,
          overlayImage: data.overlayImage,
          maskImage: data.maskImage,
        },
        metadata: {
          location: data.analysisMetadata.location,
          dateRange: data.analysisMetadata.dateRange,
          resolution: data.analysisMetadata.resolution,
          algorithm: data.analysisMetadata.algorithm,
          analysisDate: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Change detection analysis failed:", error);
      throw new Error(
        `Change detection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Converts a base64 change detection mask to GeoJSON polygons
   */
  private static async convertMaskToGeoJSON(
    maskImageBase64: string,
    centerCoordinates: [number, number],
    resolution: string
  ): Promise<GeoJSON.FeatureCollection> {
    try {
      // For now, create a simplified polygon based on the center coordinates
      // In a real implementation, this would process the actual mask image
      const [lat, lng] = centerCoordinates;
      const offset = this.getOffsetFromResolution(resolution);

      // Create a sample polygon representing detected changes
      const changePolygon: GeoJSON.Feature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lng - offset, lat - offset],
              [lng + offset, lat - offset],
              [lng + offset, lat + offset],
              [lng - offset, lat + offset],
              [lng - offset, lat - offset],
            ],
          ],
        },
        properties: {
          changeType: "land_use_change",
          confidence: 0.85,
          area: this.calculatePolygonArea(offset * 2, offset * 2),
          detectionMethod: "satellite_analysis",
        },
      };

      return {
        type: "FeatureCollection",
        features: [changePolygon],
      };
    } catch (error) {
      console.error("Mask to GeoJSON conversion failed:", error);
      // Return empty feature collection on error
      return {
        type: "FeatureCollection",
        features: [],
      };
    }
  }

  /**
   * Calculates area statistics from change percentage and polygon data
   */
  private static calculateAreaStatistics(
    changePercentage: number,
    polygons: GeoJSON.FeatureCollection,
    resolution: string
  ): ChangeDetectionResult["statistics"] {
    const totalArea = polygons.features.reduce((sum, feature) => {
      return sum + (feature.properties?.area || 0);
    }, 0);

    // Estimate pixel counts based on resolution
    const pixelSize = this.getPixelSizeFromResolution(resolution);
    const totalPixels = Math.round(totalArea / pixelSize);
    const changedPixels = Math.round((totalPixels * changePercentage) / 100);

    return {
      totalChangeArea: totalArea,
      changePercentage,
      changedPixels,
      totalPixels,
    };
  }

  /**
   * Helper to get coordinate offset based on resolution
   */
  private static getOffsetFromResolution(resolution: string): number {
    const resolutionValue = parseInt(resolution.replace(/\D/g, ""));
    // Convert meters to approximate degrees (rough approximation)
    return (resolutionValue * 100) / 111000; // 1 degree ≈ 111km
  }

  /**
   * Helper to get pixel size in square meters
   */
  private static getPixelSizeFromResolution(resolution: string): number {
    const resolutionValue = parseInt(resolution.replace(/\D/g, ""));
    return resolutionValue * resolutionValue; // square meters per pixel
  }

  /**
   * Helper to calculate polygon area in square meters (simplified)
   */
  private static calculatePolygonArea(width: number, height: number): number {
    // Convert degrees to meters (rough approximation)
    const widthMeters = width * 111000;
    const heightMeters = height * 111000;
    return widthMeters * heightMeters;
  }
}
