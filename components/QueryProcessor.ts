import { type QueryResult, type EnhancedQueryResult } from "@/lib/types";

// Enhanced natural language query processor for real estate and climate data
export interface QueryIntent {
  location?: string;
  priceChangeThreshold?: number;
  riskChangeThreshold?: number;
  timeFrame?: {
    start: number;
    end: number;
  };
  metrics: string[];
  filters: string[];
  city?: string;
}

export interface ProcessedQuery {
  intent: QueryIntent;
  narrative: string;
  confidence: number;
}

export class QueryProcessor {
  // Keywords for different categories
  private static locationKeywords = [
    "pune",
    "mumbai",
    "delhi",
    "bangalore",
    "chennai",
    "kolkata",
    "hyderabad",
    "neighborhoods",
    "areas",
    "districts",
    "localities",
    "suburbs",
    "wards",
  ];

  private static puneWardKeywords = [
    "kothrud",
    "aundh",
    "koregaon park",
    "shivajinagar",
    "viman nagar",
  ];

  private static priceKeywords = [
    "property values",
    "property prices",
    "real estate prices",
    "home values",
    "housing prices",
    "appreciation",
    "rose",
    "increased",
    "grew",
    "declined",
  ];

  private static riskKeywords = [
    "flood risk",
    "climate risk",
    "flooding",
    "water logging",
    "monsoon",
    "environmental risk",
    "weather risk",
    "disaster risk",
  ];

  private static timeKeywords = [
    "since",
    "from",
    "between",
    "after",
    "before",
    "in the last",
    "over",
    "during",
  ];

  static processQuery(query: string): ProcessedQuery {
    const normalizedQuery = query.toLowerCase();
    const intent: QueryIntent = {
      metrics: [],
      filters: [],
    };

    // Extract location and city
    const locationMatch = this.extractLocation(normalizedQuery);
    if (locationMatch) {
      intent.location = locationMatch;
    }

    // Extract city
    const cityMatch = this.extractCity(normalizedQuery);
    if (cityMatch) {
      intent.city = cityMatch;
    }

    // Extract price change threshold
    const priceMatch = normalizedQuery.match(
      /(\d+)%?\s*(?:and|&)?\s*(?:property|price|value|real estate)/
    );
    if (priceMatch) {
      intent.priceChangeThreshold = parseInt(priceMatch[1]);
    }

    // Look for percentage patterns with comparison operators
    const percentageMatches = normalizedQuery.match(
      /(?:>|above|over|more than|greater than)\s*(\d+)%/g
    );
    if (percentageMatches) {
      const percentage = parseInt(
        percentageMatches[0].match(/(\d+)/)?.[1] || "0"
      );
      if (!intent.priceChangeThreshold) {
        intent.priceChangeThreshold = percentage;
      }
    }

    // Extract risk change patterns
    const riskMatch = normalizedQuery.match(
      /(?:flood|climate|risk).*?(?:increased|rose|grew|higher)/
    );
    if (riskMatch) {
      intent.riskChangeThreshold = 25; // Default threshold
    }

    // Extract time frame
    const timeFrame = this.extractTimeFrame(normalizedQuery);
    if (timeFrame) {
      intent.timeFrame = timeFrame;
    }

    // Identify metrics of interest
    if (this.containsKeywords(normalizedQuery, this.priceKeywords)) {
      intent.metrics.push("property_prices");
    }
    if (this.containsKeywords(normalizedQuery, this.riskKeywords)) {
      intent.metrics.push("climate_risk");
    }

    // Generate narrative
    const narrative = this.generateNarrative(intent);

    // Calculate confidence based on extracted information
    const confidence = this.calculateConfidence(intent);

    return {
      intent,
      narrative,
      confidence,
    };
  }

  private static extractLocation(query: string): string | undefined {
    // First check for specific ward names in Pune
    for (const ward of this.puneWardKeywords) {
      if (query.includes(ward)) {
        return ward
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }

    // Then check for general location keywords
    for (const location of this.locationKeywords) {
      if (query.includes(location)) {
        return location.charAt(0).toUpperCase() + location.slice(1);
      }
    }
    return undefined;
  }

  private static extractCity(query: string): string | undefined {
    const cities = [
      "pune",
      "mumbai",
      "delhi",
      "bangalore",
      "chennai",
      "kolkata",
      "hyderabad",
    ];
    for (const city of cities) {
      if (query.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }
    return undefined;
  }

  private static extractTimeFrame(
    query: string
  ): { start: number; end: number } | undefined {
    // Look for year patterns
    const yearMatches = query.match(/\b(20\d{2})\b/g);
    if (yearMatches) {
      const years = yearMatches.map((y) => parseInt(y)).sort();
      if (years.length >= 1) {
        return {
          start: years[0],
          end: new Date().getFullYear(),
        };
      }
    }

    // Look for "since" patterns
    const sinceMatch = query.match(/since\s+(20\d{2})/);
    if (sinceMatch) {
      return {
        start: parseInt(sinceMatch[1]),
        end: new Date().getFullYear(),
      };
    }

    return undefined;
  }

  private static containsKeywords(query: string, keywords: string[]): boolean {
    return keywords.some((keyword) => query.includes(keyword));
  }

  private static generateNarrative(intent: QueryIntent): string {
    let narrative = "Analyzing ";

    if (intent.city) {
      narrative += `${intent.city} `;
    }

    if (intent.location && intent.location !== intent.city) {
      narrative += `${intent.location} `;
    } else if (!intent.city) {
      narrative += "areas ";
    }

    narrative += "where ";

    const conditions = [];

    if (intent.priceChangeThreshold) {
      conditions.push(
        `property values increased by more than ${intent.priceChangeThreshold}%`
      );
    }

    if (intent.riskChangeThreshold) {
      conditions.push(`climate/flood risk has increased`);
    }

    if (intent.timeFrame) {
      conditions.push(`since ${intent.timeFrame.start}`);
    }

    narrative += conditions.join(" and ");
    narrative +=
      ". Searching for matching neighborhoods with supporting data and evidence.";

    return narrative;
  }

  private static calculateConfidence(intent: QueryIntent): number {
    let score = 0;

    // Base score for having any intent
    if (Object.keys(intent).length > 2) score += 30;

    // Location identified
    if (intent.location) score += 25;

    // Specific thresholds
    if (intent.priceChangeThreshold) score += 20;
    if (intent.riskChangeThreshold) score += 15;

    // Time frame
    if (intent.timeFrame) score += 10;

    return Math.min(score, 100);
  }
}

// Real data API client for property and climate data
export class RealDataAPIClient {
  static async queryNaturalLanguageAPI(
    query: string
  ): Promise<EnhancedQueryResult> {
    try {
      // Try Gemini-powered endpoint first, fallback to basic endpoint
      const response = await fetch("/api/gemini-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      let data;
      if (!response.ok) {
        // Fallback to basic query endpoint
        const fallbackResponse = await fetch("/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!fallbackResponse.ok) {
          throw new Error("Both API endpoints failed");
        }

        data = await fallbackResponse.json();
      } else {
        data = await response.json();
      }

      // Convert API response to map-compatible format
      return {
        polygons: data.results.map((result: QueryResult, index: number) => ({
          id: `${result.ward.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          coordinates: [this.generatePolygonCoordinates(result.coordinates)],
          properties: {
            name: result.ward,
            priceChange: result.priceChangePercent,
            floodRisk: this.getRiskScoreFromLevel(result.currentRiskLevel),
            area: result.ward,
            population: result.population,
            avgPropertyValue: result.avgPropertyValue,
            ward: result.ward,
            city: data.city,
          },
        })),
        summary: {
          totalAreas: data.results.length,
          avgPriceIncrease:
            data.results.reduce(
              (sum: number, r: QueryResult) => sum + r.priceChangePercent,
              0
            ) / (data.results.length || 1),
          avgFloodRiskIncrease:
            data.results.reduce(
              (sum: number, r: QueryResult) =>
                sum + this.getRiskScoreFromLevel(r.currentRiskLevel),
              0
            ) / (data.results.length || 1),
          timeRange: data.filters.timeRange || "2015-2024",
          totalPopulation: data.results.reduce(
            (sum: number, r: QueryResult) => sum + (r.population || 0),
            0
          ),
        },
        insights: data.insights || [],
        city: data.city,
        dataSource: {
          propertyData: data.sources?.[0] || "Real-time Property Data",
          riskData: data.sources?.[1] || "Climate Risk Assessment",
          boundaryData: data.sources?.[2] || "Municipal GIS Systems",
        },
        meta: data.meta || {
          queryProcessed: query,
          resultsCount: data.results.length,
          aiProcessed: true,
          geminiUsed: data.meta?.geminiUsed || false,
        },
      };
    } catch (error) {
      console.error("Failed to query real APIs:", error);
      throw new Error(
        `Failed to fetch real data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private static generatePolygonCoordinates(
    center: [number, number]
  ): number[][] {
    const [lat, lng] = center;
    const offset = 0.01; // Roughly 1km at this latitude

    return [
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ];
  }

  private static getRiskScoreFromLevel(level: string): number {
    switch (level) {
      case "Very High":
        return 85;
      case "High":
        return 70;
      case "Moderate":
        return 45;
      case "Low":
        return 25;
      default:
        return 30;
    }
  }
}
