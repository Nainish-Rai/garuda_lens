import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { processNaturalLanguageQuery } from "@/lib/data-fetchers";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    // Extract city from query
    const cityMatch = query
      .toLowerCase()
      .match(/\b(pune|mumbai|delhi|bangalore)\b/);
    const city = cityMatch ? cityMatch[1] : "pune";
    const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);

    // Process the query with real data
    const results = await processNaturalLanguageQuery(query);

    let geminiInsights: string[] = [];
    let geminiUsed = false;

    // Try to get enhanced insights from Gemini AI
    if (process.env.GEMINI_API_KEY && results.length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Create context for Gemini
        const context = `
          Query: "${query}"
          City: ${cityCapitalized}

          Results found: ${results.length} wards
          Ward data:
          ${results
            .map(
              (r) => `
          - ${r.ward}: ${r.priceChangePercent}% price increase, ${
                r.currentRiskLevel
              } flood risk
            Population: ${
              r.population ? (r.population / 1000).toFixed(0) + "K" : "N/A"
            }
            Property value: ${r.avgPropertyValue || "N/A"}
          `
            )
            .join("")}

          Please provide 3-4 analytical insights about climate gentrification patterns, focusing on:
          1. The relationship between property value growth and climate risk
          2. Socioeconomic implications for residents
          3. Urban planning considerations
          4. Future trends and recommendations

          Keep insights factual, specific to the data, and under 50 words each.
        `;

        const result = await model.generateContent(context);
        const response = await result.response;
        const text = response.text();

        // Parse Gemini response into individual insights
        geminiInsights = text
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .filter((line) => !line.match(/^\d+\./)) // Remove numbered list markers
          .map((line) => line.replace(/^[-•]\s*/, "").trim()) // Remove bullet points
          .filter((line) => line.length > 20) // Filter out short lines
          .slice(0, 4); // Limit to 4 insights

        geminiUsed = true;
      } catch (error) {
        console.warn("Gemini AI unavailable, using standard insights:", error);
        // Fall back to standard insights if Gemini fails
      }
    }

    // Generate standard insights if Gemini is not available or failed
    const standardInsights = [];
    if (results.length > 0) {
      const avgPriceChange =
        results.reduce((sum, r) => sum + r.priceChangePercent, 0) /
        results.length;

      standardInsights.push(
        `Average property appreciation of ${avgPriceChange.toFixed(
          1
        )}% across ${
          results.length
        } wards indicates significant market activity`
      );

      const highRiskCount = results.filter(
        (r) =>
          r.currentRiskLevel === "High" || r.currentRiskLevel === "Very High"
      ).length;

      if (highRiskCount > 0) {
        standardInsights.push(
          `${highRiskCount}/${results.length} wards now face high flood risk, suggesting climate vulnerability is increasing alongside property values`
        );
      }

      const totalPopulation = results.reduce(
        (sum, r) => sum + (r.population || 0),
        0
      );
      if (totalPopulation > 0) {
        standardInsights.push(
          `Approximately ${(totalPopulation / 1000).toFixed(
            0
          )}K residents in these areas may face displacement pressure from rising property costs`
        );
      }

      if (results.length > 1) {
        standardInsights.push(
          "Multiple wards showing this pattern indicates systematic climate gentrification dynamics in the region"
        );
      }
    }

    // Use Gemini insights if available, otherwise use standard ones
    const insights =
      geminiInsights.length > 0 ? geminiInsights : standardInsights;

    // Generate comprehensive summary
    let summary = "";
    if (results.length === 0) {
      summary = `No wards in ${cityCapitalized} match the specified criteria.`;
    } else {
      const wardNames =
        results.length <= 3
          ? results.map((r) => r.ward).join(" and ")
          : `${results
              .slice(0, 2)
              .map((r) => r.ward)
              .join(", ")} and ${results.length - 2} others`;

      const avgPriceChange =
        results.reduce((sum, r) => sum + r.priceChangePercent, 0) /
        results.length;

      summary = `Analysis of ${cityCapitalized} reveals ${wardNames} experiencing ${
        avgPriceChange > 40
          ? "substantial"
          : avgPriceChange > 25
          ? "significant"
          : "moderate"
      } property value increases (${avgPriceChange.toFixed(
        1
      )}% average) concurrent with heightened climate risk. This correlation suggests emerging climate gentrification patterns that may displace vulnerable populations while concentrating environmental hazards in high-value areas.`;
    }

    const processingTime = Date.now() - startTime;

    // Extract query parameters
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
      city: cityCapitalized,
      filters: {
        priceChangePercent: priceThresholdMatch
          ? `>${priceThresholdMatch[1]}`
          : "any",
        riskIncrease: hasRiskCriteria,
        timeRange,
        naturalLanguageQuery:
          query.substring(0, 150) + (query.length > 150 ? "..." : ""),
      },
      results,
      summary,
      insights,
      sources: [
        "Real-time Property Data APIs",
        "Climate Risk Assessment Systems",
        "Municipal Geographic Information Systems",
        "Demographic and Census Data",
      ],
      meta: {
        queryProcessed: query,
        resultsCount: results.length,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        geminiUsed,
        dataFreshness: "Real-time aggregated data",
        aiProcessed: true,
      },
    });
  } catch (error) {
    console.error("Gemini query processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process query with AI enhancement",
        message: error instanceof Error ? error.message : "Unknown error",
        fallback: "Try using the basic query endpoint",
      },
      { status: 500 }
    );
  }
}
