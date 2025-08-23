import { NextRequest, NextResponse } from "next/server";
import { fetchPriceData } from "@/lib/data-fetchers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const year = searchParams.get("year");
  const quarter = searchParams.get("quarter") || "Q4";

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
    // Fetch real price data
    const priceData = await fetchPriceData(
      city,
      year ? parseInt(year) : undefined
    );

    if (!priceData || priceData.length === 0) {
      return NextResponse.json(
        {
          error: `No data available for ${city}${
            year ? ` in year ${year}` : ""
          }`,
          supportedCities: ["Pune", "Mumbai", "Delhi", "Bangalore"],
        },
        { status: 404 }
      );
    }

    // If no year specified, return all available data
    if (!year) {
      return NextResponse.json({
        city: city.charAt(0).toUpperCase() + city.slice(1),
        data: priceData,
        meta: {
          description: `Property price index for ${
            city.charAt(0).toUpperCase() + city.slice(1)
          }`,
          baseYear: 2015,
          lastUpdated: new Date().toISOString().split("T")[0],
          dataSource: "Real-time property data aggregation",
        },
      });
    }

    // Find data for specific year
    const yearNum = parseInt(year);
    const yearData = priceData.find((entry) => entry.year === yearNum);

    if (!yearData) {
      return NextResponse.json(
        {
          error: `No data available for year ${year}`,
          availableYears: priceData.map((entry) => entry.year),
        },
        { status: 404 }
      );
    }

    // Calculate year-over-year change
    const previousYearData = priceData.find(
      (entry) => entry.year === yearNum - 1
    );
    const changeFromPreviousYear = previousYearData
      ? (
          ((yearData.priceIndex - previousYearData.priceIndex) /
            previousYearData.priceIndex) *
          100
        ).toFixed(2) + "%"
      : "N/A";

    return NextResponse.json({
      city: city.charAt(0).toUpperCase() + city.slice(1),
      year: yearNum,
      quarter: quarter,
      priceIndex: yearData.priceIndex,
      unit: yearData.unit,
      source: yearData.source,
      meta: {
        changeFromPreviousYear,
        changeFromBase: yearData.meta?.changeFromBase || "N/A",
        description:
          yearData.meta?.description || `Property price data for ${city}`,
      },
    });
  } catch (error) {
    console.error("Error fetching price data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch price data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
