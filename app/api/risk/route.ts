import { NextRequest, NextResponse } from "next/server";
import { fetchRiskData, fetchWardData } from "@/lib/data-fetchers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const ward = searchParams.get("ward");
  const year = searchParams.get("year");

  // Validate city parameter
  if (!city) {
    return NextResponse.json(
      {
        error: "City parameter is required.",
        supportedCities: ["Pune", "Mumbai", "Delhi", "Bangalore"],
      },
      { status: 400 }
    );
  }

  try {
    // If no ward specified, return all wards data
    if (!ward) {
      const allWardsData = await fetchWardData(city);

      if (!allWardsData || allWardsData.length === 0) {
        return NextResponse.json(
          {
            error: `No ward data available for ${city}`,
            supportedCities: ["Pune", "Mumbai", "Delhi", "Bangalore"],
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        city: city.charAt(0).toUpperCase() + city.slice(1),
        wards: allWardsData.map((w) => ({
          ward: w.ward,
          coordinates: w.coordinates,
          population: w.population,
          avgPropertyValue: w.avgPropertyValue,
          currentRisk: w.currentRisk,
          riskTrend: w.riskTrend,
        })),
        meta: {
          availableWards: allWardsData.map((w) => w.ward),
          dataSource: "Real-time flood risk assessment",
          lastUpdated: new Date().toISOString().split("T")[0],
        },
      });
    }

    // Find specific ward data
    const wardData = await fetchWardData(city, ward);

    if (!wardData || wardData.length === 0) {
      return NextResponse.json(
        {
          error: `Ward '${ward}' not found in ${city}`,
          message: "Try fetching all wards to see available options",
        },
        { status: 404 }
      );
    }

    const specificWard = wardData[0]; // Should be exactly one match

    // If year specified, return risk data for that year
    if (year) {
      const yearNum = parseInt(year);
      const riskData = await fetchRiskData(city, specificWard.ward, yearNum);

      const yearData = riskData.find((r) => r.year === yearNum);

      if (!yearData) {
        return NextResponse.json(
          {
            error: `No risk data available for year ${year}`,
            availableYears: riskData.map((r) => r.year),
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        city: city.charAt(0).toUpperCase() + city.slice(1),
        ward: specificWard.ward,
        year: yearNum,
        coordinates: specificWard.coordinates,
        floodRiskLevel: yearData.floodRiskLevel,
        riskScore: yearData.riskScore,
        unit: yearData.unit,
        source: yearData.source,
        meta: {
          description:
            "Flood risk assessment based on real-time climate and infrastructure data",
          riskLevels: {
            Low: "0.0 - 0.3",
            Moderate: "0.3 - 0.6",
            High: "0.6 - 0.8",
            "Very High": "0.8 - 1.0",
          },
        },
      });
    }

    // Return all historical data for the ward
    const historicalRiskData = await fetchRiskData(city, specificWard.ward);

    return NextResponse.json({
      city: city.charAt(0).toUpperCase() + city.slice(1),
      ward: specificWard.ward,
      coordinates: specificWard.coordinates,
      population: specificWard.population,
      avgPropertyValue: specificWard.avgPropertyValue,
      historicalData: historicalRiskData,
      currentRisk: specificWard.currentRisk,
      riskTrend: specificWard.riskTrend,
      unit: "0–1 scale",
      source: "Real-time flood risk assessment",
      meta: {
        description:
          "Comprehensive flood risk assessment with historical trends",
        dataPoints: historicalRiskData.length,
        lastUpdated: new Date().toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Error fetching risk data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch risk data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
