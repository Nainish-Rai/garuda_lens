// Simple natural language query processor for real estate and climate data
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
}

export interface ProcessedQuery {
  intent: QueryIntent;
  narrative: string;
  confidence: number;
}

export class QueryProcessor {
  // Keywords for different categories
  private static locationKeywords = [
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

    // Extract location
    const locationMatch = this.extractLocation(normalizedQuery);
    if (locationMatch) {
      intent.location = locationMatch;
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
    for (const location of this.locationKeywords) {
      if (query.includes(location)) {
        return location.charAt(0).toUpperCase() + location.slice(1);
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

    if (intent.location) {
      narrative += `${intent.location} `;
    }

    narrative += "areas where ";

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

// Mock data generator for demonstration
export class MockDataGenerator {
  static generateResults(intent: QueryIntent): {
    polygons: Array<{
      id: string;
      coordinates: number[][][];
      properties: {
        name: string;
        priceChange: number;
        floodRisk: number;
        area: string;
        population?: number;
        avgPropertyValue?: string;
      };
    }>;
    summary: {
      totalAreas: number;
      avgPriceIncrease: number;
      avgFloodRiskIncrease: number;
      timeRange: string;
      totalPopulation?: number;
    };
    insights: string[];
  } {
    const areas = [
      {
        name: "Bandra West",
        coordinates: [
          [72.8077, 19.046],
          [72.8277, 19.046],
          [72.8277, 19.066],
          [72.8077, 19.066],
          [72.8077, 19.046],
        ],
        priceChange: 35,
        floodRisk: 45,
        population: 85000,
        avgPropertyValue: "₹12.5 Cr",
      },
      {
        name: "Khar West",
        coordinates: [
          [72.8477, 19.076],
          [72.8677, 19.076],
          [72.8677, 19.096],
          [72.8477, 19.096],
          [72.8477, 19.076],
        ],
        priceChange: 42,
        floodRisk: 38,
        population: 72000,
        avgPropertyValue: "₹8.3 Cr",
      },
      {
        name: "Juhu",
        coordinates: [
          [72.8177, 19.096],
          [72.8377, 19.096],
          [72.8377, 19.116],
          [72.8177, 19.116],
          [72.8177, 19.096],
        ],
        priceChange: 38,
        floodRisk: 52,
        population: 65000,
        avgPropertyValue: "₹15.2 Cr",
      },
    ];

    // Filter based on intent
    const filteredAreas = areas.filter((area) => {
      if (
        intent.priceChangeThreshold &&
        area.priceChange < intent.priceChangeThreshold
      ) {
        return false;
      }
      if (
        intent.riskChangeThreshold &&
        area.floodRisk < intent.riskChangeThreshold
      ) {
        return false;
      }
      return true;
    });

    return {
      polygons: filteredAreas.map((area, index) => ({
        id: `area-${index}`,
        coordinates: [area.coordinates],
        properties: {
          name: area.name,
          priceChange: area.priceChange,
          floodRisk: area.floodRisk,
          population: area.population,
          avgPropertyValue: area.avgPropertyValue,
          area: area.name.split(" ")[0],
        },
      })),
      summary: {
        totalAreas: filteredAreas.length,
        avgPriceIncrease:
          filteredAreas.reduce((sum, area) => sum + area.priceChange, 0) /
          filteredAreas.length,
        avgFloodRiskIncrease:
          filteredAreas.reduce((sum, area) => sum + area.floodRisk, 0) /
          filteredAreas.length,
        timeRange: intent.timeFrame
          ? `${intent.timeFrame.start} - ${intent.timeFrame.end}`
          : "2015 - 2024",
        totalPopulation: filteredAreas.reduce(
          (sum, area) => sum + area.population,
          0
        ),
      },
      insights: [
        `Found ${filteredAreas.length} neighborhoods matching your criteria`,
        `Average property appreciation: ${(
          filteredAreas.reduce((sum, area) => sum + area.priceChange, 0) /
          filteredAreas.length
        ).toFixed(1)}%`,
        `These areas show correlation between property value growth and increased flood risk`,
        `Total population affected: ${(
          filteredAreas.reduce((sum, area) => sum + area.population, 0) / 1000
        ).toFixed(0)}K residents`,
      ],
    };
  }
}
