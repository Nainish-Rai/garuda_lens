// Core data types for the Climate Gentrification Sentinel

export interface PriceData {
  year: number;
  quarter: string;
  priceIndex: number;
  unit: string;
  source: string;
  meta?: {
    changeFromPreviousYear?: string;
    changeFromBase?: string;
    description?: string;
  };
}

export interface RiskData {
  year: number;
  floodRiskLevel: "Low" | "Moderate" | "High" | "Very High";
  riskScore: number; // 0-1 scale
  unit: string;
  source: string;
}

export interface WardData {
  ward: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  population?: number;
  avgPropertyValue?: string;
  currentRisk: RiskData;
  riskTrend: {
    baselineScore: number;
    currentScore: number;
    changePercent: string;
  };
  historicalData?: RiskData[];
}

export interface QueryFilters {
  priceChangePercent?: string;
  riskIncrease?: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  ward?: string;
  city?: string;
}

export interface QueryResult {
  ward: string;
  coordinates: [number, number];
  priceChangePercent: number;
  riskChange: string;
  currentRiskLevel: string;
  currentPriceIndex: number;
  population?: number;
  avgPropertyValue?: string;
}

export interface NaturalLanguageQueryResponse {
  city: string;
  filters: QueryFilters;
  results: QueryResult[];
  summary: string;
  insights: string[];
  sources: string[];
  meta: {
    queryProcessed: string;
    resultsCount: number;
    processingTime: string;
  };
}

// Map visualization types
export interface MapPolygon {
  id: string;
  coordinates: number[][][];
  properties: {
    name: string;
    priceChange: number;
    floodRisk: number;
    area: string;
    population?: number;
    avgPropertyValue?: string;
    ward?: string;
    city?: string;
  };
}

export interface MapData {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Polygon";
      coordinates: number[][][];
    };
    properties: MapPolygon["properties"];
  }>;
}

export interface ViewState {
  center: [number, number]; // [lat, lng]
  zoom: number;
}

export interface LayerState {
  propertyHeatmap: boolean;
  climateRisk: boolean;
  boundaries: boolean;
}

// Enhanced query result for map visualization
export interface EnhancedQueryResult {
  polygons: MapPolygon[];
  summary: {
    totalAreas: number;
    avgPriceIncrease: number;
    avgFloodRiskIncrease: number;
    timeRange: string;
    totalPopulation?: number;
  };
  insights?: string[];
  city: string;
  dataSource: {
    propertyData: string;
    riskData: string;
    boundaryData: string;
  };
  meta?: {
    queryProcessed?: string;
    resultsCount?: number;
    processingTime?: string;
    aiProcessed?: boolean;
    geminiUsed?: boolean;
  };
  // NEW: Add satellite imagery support
  satelliteData?: SatelliteImageData;
  analysisType?:
    | "deforestation"
    | "urbanization"
    | "change_detection"
    | "gentrification";
  statistics?: (
    | ChangeDetectionStats
    | DeforestationStats
    | UrbanizationStats
  ) & {
    ndviData?: any; // Allow NDVI data to be attached to any statistics type
  };
}

// City-specific configurations
export interface CityConfig {
  name: string;
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
  dataSources: {
    property: string;
    climate: string;
    boundaries: string;
  };
  availableWards: string[];
}

export const CITY_CONFIGS: Record<string, CityConfig> = {
  pune: {
    name: "Pune",
    center: [18.5204, 73.8567],
    zoom: 11,
    bounds: [
      [18.4088, 73.747],
      [18.6298, 73.9875],
    ],
    dataSources: {
      property: "NHB RESIDEX",
      climate: "CWC Flood Hazard Maps + PMC GIS",
      boundaries: "Pune Municipal Corporation GIS",
    },
    availableWards: [
      "Kothrud",
      "Aundh",
      "Koregaon Park",
      "Shivajinagar",
      "Viman Nagar",
    ],
  },
  mumbai: {
    name: "Mumbai",
    center: [19.076, 72.8777],
    zoom: 10,
    bounds: [
      [18.9, 72.7],
      [19.25, 72.95],
    ],
    dataSources: {
      property: "Mumbai Property Registry",
      climate: "BMC Flood Risk Assessment",
      boundaries: "Mumbai Municipal Corporation GIS",
    },
    availableWards: [
      "Bandra West",
      "Khar West",
      "Juhu",
      "Andheri East",
      "Powai",
    ],
  },
};

// API response types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface PriceAPIResponse extends APIResponse<PriceData | PriceData[]> {
  city: string;
  year?: number;
  quarter?: string;
}

export interface RiskAPIResponse extends APIResponse<WardData | WardData[]> {
  city: string;
  ward?: string;
  year?: number;
}

// NEW: Task 4 - Enhanced types for satellite imagery and async job handling
export interface SatelliteImageData {
  beforeImage: string; // base64 encoded
  afterImage: string; // base64 encoded
  overlayImage: string; // base64 encoded
  maskImage: string; // base64 encoded
  analysisMetadata: {
    location: string;
    dateRange: [string, string];
    resolution: string;
    algorithm: string;
    analysisDate: string;
  };
}

export interface AnalysisJobStatus {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  progress: string;
  elapsedTime: number;
  data?: any;
  error?: string;
}

export interface ChangeDetectionStats {
  totalChangeArea: number;
  changePercentage: number;
  changedPixels: number;
  totalPixels: number;
}

export interface DeforestationStats {
  deforestedArea: number;
  forestLossPercentage: number;
  originalForestArea: number;
  remainingForestArea: number;
  treeCoverLoss: number;
  averageTreeDensityChange: number;
}

export interface UrbanizationStats {
  newUrbanArea: number;
  urbanGrowthPercentage: number;
  populationImpact: {
    estimatedPopulation: number;
    populationDensity: number;
    confidence: number;
  };
  urbanGrowthMetrics: {
    developmentRate: number;
    infrastructureExpansion: number;
    averageUrbanDensityChange: number;
  };
}
