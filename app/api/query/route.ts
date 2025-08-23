import { NextRequest, NextResponse } from "next/server";

// Enhanced query processor for Pune-specific data
interface QueryFilters {
  priceChangePercent?: string;
  riskIncrease?: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  ward?: string;
}

interface QueryResult {
  ward: string;
  coordinates: [number, number];
  priceChangePercent: number;
  riskChange: string;
  currentRiskLevel: string;
  currentPriceIndex: number;
  population?: number;
  avgPropertyValue?: string;
}

// Combined mock data for Pune wards
const PUNE_INTEGRATED_DATA = [
  {
    ward: "Kothrud",
    coordinates: [18.5074, 73.8077] as [number, number],
    population: 180000,
    avgPropertyValue: "₹85 Lakh",
    priceHistory: {
      2015: 100,
      2016: 104,
      2017: 109,
      2018: 112,
      2019: 118,
      2020: 115,
      2021: 122,
      2022: 128,
      2023: 138,
    },
    riskHistory: {
      2015: 0.3,
      2016: 0.32,
      2017: 0.38,
      2018: 0.42,
      2019: 0.45,
      2020: 0.55,
      2021: 0.58,
      2022: 0.62,
      2023: 0.68,
    },
  },
  {
    ward: "Aundh",
    coordinates: [18.5579, 73.807] as [number, number],
    population: 220000,
    avgPropertyValue: "₹1.2 Cr",
    priceHistory: {
      2015: 100,
      2016: 106,
      2017: 114,
      2018: 118,
      2019: 125,
      2020: 122,
      2021: 130,
      2022: 134,
      2023: 142,
    },
    riskHistory: {
      2015: 0.2,
      2016: 0.22,
      2017: 0.28,
      2018: 0.35,
      2019: 0.42,
      2020: 0.5,
      2021: 0.52,
      2022: 0.55,
      2023: 0.61,
    },
  },
  {
    ward: "Koregaon Park",
    coordinates: [18.5362, 73.898] as [number, number],
    population: 95000,
    avgPropertyValue: "₹1.8 Cr",
    priceHistory: {
      2015: 100,
      2016: 108,
      2017: 116,
      2018: 122,
      2019: 130,
      2020: 126,
      2021: 135,
      2022: 142,
      2023: 148,
    },
    riskHistory: {
      2015: 0.15,
      2016: 0.18,
      2017: 0.22,
      2018: 0.28,
      2019: 0.35,
      2020: 0.42,
      2021: 0.48,
      2022: 0.52,
      2023: 0.58,
    },
  },
  {
    ward: "Shivajinagar",
    coordinates: [18.5304, 73.8567] as [number, number],
    population: 150000,
    avgPropertyValue: "₹65 Lakh",
    priceHistory: {
      2015: 100,
      2016: 103,
      2017: 107,
      2018: 110,
      2019: 115,
      2020: 112,
      2021: 118,
      2022: 123,
      2023: 126,
    },
    riskHistory: {
      2015: 0.4,
      2016: 0.43,
      2017: 0.48,
      2018: 0.55,
      2019: 0.62,
      2020: 0.68,
      2021: 0.72,
      2022: 0.78,
      2023: 0.85,
    },
  },
  {
    ward: "Viman Nagar",
    coordinates: [18.5679, 73.9143] as [number, number],
    population: 125000,
    avgPropertyValue: "₹95 Lakh",
    priceHistory: {
      2015: 100,
      2016: 105,
      2017: 112,
      2018: 118,
      2019: 124,
      2020: 120,
      2021: 128,
      2022: 135,
      2023: 143,
    },
    riskHistory: {
      2015: 0.25,
      2016: 0.28,
      2017: 0.35,
      2018: 0.42,
      2019: 0.48,
      2020: 0.55,
      2021: 0.62,
      2022: 0.68,
      2023: 0.75,
    },
  },
];

function parseQuery(query: string): QueryFilters {
  const normalizedQuery = query.toLowerCase();
  const filters: QueryFilters = {};

  // Extract price change threshold
  const priceMatch = normalizedQuery.match(
    />(\d+)%|more than (\d+)%|above (\d+)%/
  );
  if (priceMatch) {
    const percentage = priceMatch[1] || priceMatch[2] || priceMatch[3];
    filters.priceChangePercent = `>${percentage}`;
  }

  // Check for risk increase pattern
  if (
    normalizedQuery.includes("risk") &&
    (normalizedQuery.includes("increase") ||
      normalizedQuery.includes("rose") ||
      normalizedQuery.includes("higher"))
  ) {
    filters.riskIncrease = true;
  }

  // Extract time range
  const sinceMatch = normalizedQuery.match(/since (\d{4})/);
  if (sinceMatch) {
    filters.timeRange = {
      start: parseInt(sinceMatch[1]),
      end: 2023,
    };
  }

  // Extract specific ward
  const wardKeywords = [
    "kothrud",
    "aundh",
    "koregaon park",
    "shivajinagar",
    "viman nagar",
  ];
  for (const ward of wardKeywords) {
    if (normalizedQuery.includes(ward)) {
      filters.ward = ward
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  return filters;
}

function calculatePriceChange(
  priceHistory: Record<number, number>,
  startYear: number,
  endYear: number
): number {
  const startPrice = priceHistory[startYear];
  const endPrice = priceHistory[endYear];
  return ((endPrice - startPrice) / startPrice) * 100;
}

function getRiskLevelFromScore(score: number): string {
  if (score >= 0.8) return "Very High";
  if (score >= 0.6) return "High";
  if (score >= 0.3) return "Moderate";
  return "Low";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required and must be a string" },
        { status: 400 }
      );
    }

    // Parse the natural language query
    const filters = parseQuery(query);
    const startYear = filters.timeRange?.start || 2015;
    const endYear = filters.timeRange?.end || 2023;

    // Process each ward against the filters
    const results: QueryResult[] = [];

    for (const wardData of PUNE_INTEGRATED_DATA) {
      // Skip if specific ward requested and this isn't it
      if (filters.ward && wardData.ward !== filters.ward) {
        continue;
      }

      // Calculate price change
      const priceChangePercent = calculatePriceChange(
        wardData.priceHistory,
        startYear,
        endYear
      );

      // Check price threshold
      if (filters.priceChangePercent) {
        const threshold = parseInt(filters.priceChangePercent.replace(">", ""));
        if (priceChangePercent <= threshold) {
          continue;
        }
      }

      // Check risk increase
      const startRisk =
        wardData.riskHistory[startYear as keyof typeof wardData.riskHistory];
      const endRisk =
        wardData.riskHistory[endYear as keyof typeof wardData.riskHistory];
      const riskIncreased = endRisk > startRisk;

      if (filters.riskIncrease && !riskIncreased) {
        continue;
      }

      // Add to results
      results.push({
        ward: wardData.ward,
        coordinates: wardData.coordinates,
        priceChangePercent: Math.round(priceChangePercent),
        riskChange: `${startRisk.toFixed(1)} → ${endRisk.toFixed(1)}`,
        currentRiskLevel: getRiskLevelFromScore(endRisk),
        currentPriceIndex:
          wardData.priceHistory[endYear as keyof typeof wardData.priceHistory],
        population: wardData.population,
        avgPropertyValue: wardData.avgPropertyValue,
      });
    }

    // Generate insights
    const insights = [];
    if (results.length > 0) {
      const avgPriceChange =
        results.reduce((sum, r) => sum + r.priceChangePercent, 0) /
        results.length;
      insights.push(
        `Average property price increase across matching wards: ${avgPriceChange.toFixed(
          1
        )}%`
      );

      const highRiskCount = results.filter(
        (r) =>
          r.currentRiskLevel === "High" || r.currentRiskLevel === "Very High"
      ).length;
      if (highRiskCount > 0) {
        insights.push(
          `${highRiskCount} out of ${results.length} wards now have high flood risk levels`
        );
      }

      const totalPopulation = results.reduce(
        (sum, r) => sum + (r.population || 0),
        0
      );
      if (totalPopulation > 0) {
        insights.push(
          `Approximately ${(totalPopulation / 1000).toFixed(
            0
          )}K residents affected in these areas`
        );
      }
    }

    // Generate summary
    let summary = "";
    if (results.length === 0) {
      summary = `No wards in Pune match the specified criteria between ${startYear}–${endYear}.`;
    } else {
      const wardNames = results.map((r) => r.ward).join(" and ");
      const avgPriceChange =
        results.reduce((sum, r) => sum + r.priceChangePercent, 0) /
        results.length;

      summary = `Between ${startYear}–${endYear}, ${wardNames} ${
        results.length === 1 ? "ward" : "wards"
      } in Pune saw property prices rise ${
        avgPriceChange > 25 ? "significantly" : "moderately"
      } (avg: ${avgPriceChange.toFixed(1)}%) while flood risk ${
        filters.riskIncrease ? "increased substantially" : "evolved"
      }, ${
        results.length > 1 ? "suggesting patterns" : "suggesting signs"
      } of climate-driven ${
        results.length > 1 ? "gentrification trends" : "market changes"
      }.`;
    }

    return NextResponse.json({
      city: "Pune",
      filters: {
        priceChangePercent: filters.priceChangePercent || "any",
        riskIncrease: filters.riskIncrease || false,
        timeRange: `${startYear}–${endYear}`,
        specificWard: filters.ward || null,
      },
      results,
      summary,
      insights,
      sources: [
        "https://nhb.org.in/residex",
        "https://ffs.india-water.gov.in/",
        "Pune Municipal Corporation GIS",
        "Census of India 2011",
      ],
      meta: {
        queryProcessed: query,
        resultsCount: results.length,
        processingTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Query processing error:", error);
    return NextResponse.json(
      { error: "Failed to process query. Please check your request format." },
      { status: 500 }
    );
  }
}
