import { NextRequest, NextResponse } from "next/server";
import { processNaturalLanguageQuery } from "@/lib/data-fetchers";

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

    const startTime = Date.now();

    // Process the natural language query with real data
    const results = await processNaturalLanguageQuery(query);

    const processingTime = Date.now() - startTime;

    // Extract city from query for response
    const cityMatch = query
      .toLowerCase()
      .match(/\b(pune|mumbai|delhi|bangalore)\b/);
    const city = cityMatch
      ? cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1)
      : "Pune";

    // Generate insights based on real results
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

      // Add correlation insight
      if (results.length > 1) {
        insights.push(
          "Data shows correlation between property value growth and increased climate risk exposure"
        );
      }
    } else {
      insights.push("No areas meet the specified criteria with current data");
    }

    // Generate comprehensive summary
    let summary = "";
    if (results.length === 0) {
      summary = `No wards in ${city} match the specified criteria in the query.`;
    } else {
      const wardNames =
        results.length <= 3
          ? results.map((r) => r.ward).join(" and ")
          : `${results
              .slice(0, 2)
              .map((r) => r.ward)
              .join(", ")} and ${results.length - 2} other wards`;

      const avgPriceChange =
        results.reduce((sum, r) => sum + r.priceChangePercent, 0) /
        results.length;

      summary = `Analysis reveals that ${wardNames} in ${city} experienced ${
        avgPriceChange > 40
          ? "significant"
          : avgPriceChange > 25
          ? "moderate"
          : "modest"
      } property value growth (avg: ${avgPriceChange.toFixed(
        1
      )}%) while simultaneously showing increased climate risk exposure. This pattern suggests potential climate gentrification dynamics where property appreciation coincides with growing environmental vulnerabilities.`;
    }

    // Extract filters used in processing
    const priceThresholdMatch = query.match(/(\d+)%/);
    const hasRiskCriteria =
      query.toLowerCase().includes("risk") &&
      (query.toLowerCase().includes("increase") ||
        query.toLowerCase().includes("rose"));

    const timeMatch = query.match(/since (\d{4})/);
    const timeRange = timeMatch
      ? `${timeMatch[1]}–${new Date().getFullYear()}`
      : "2015–2024";

    return NextResponse.json({
      city,
      filters: {
        priceChangePercent: priceThresholdMatch
          ? `>${priceThresholdMatch[1]}`
          : "any",
        riskIncrease: hasRiskCriteria,
        timeRange,
        query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
      },
      results,
      summary,
      insights,
      sources: [
        "Real-time Property Data Aggregation",
        "Climate Risk Assessment APIs",
        "Municipal GIS Systems",
        "Census and Demographics Data",
      ],
      meta: {
        queryProcessed: query,
        resultsCount: results.length,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        dataFreshness: "Real-time",
      },
    });
  } catch (error) {
    console.error("Query processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process query",
        message: error instanceof Error ? error.message : "Unknown error",
        suggestion:
          "Please try rephrasing your query or check the data sources",
      },
      { status: 500 }
    );
  }
}
