import { NextRequest, NextResponse } from "next/server";

// Mock NHB RESIDEX data for Pune (2015-2023)
const PUNE_PRICE_DATA = [
  { year: 2015, priceIndex: 100.0, quarter: "Q4" },
  { year: 2016, priceIndex: 103.2, quarter: "Q4" },
  { year: 2017, priceIndex: 107.8, quarter: "Q4" },
  { year: 2018, priceIndex: 110.5, quarter: "Q4" },
  { year: 2019, priceIndex: 114.2, quarter: "Q4" },
  { year: 2020, priceIndex: 112.3, quarter: "Q4" },
  { year: 2021, priceIndex: 115.8, quarter: "Q4" },
  { year: 2022, priceIndex: 121.4, quarter: "Q4" },
  { year: 2023, priceIndex: 128.6, quarter: "Q4" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const year = searchParams.get("year");
  const quarter = searchParams.get("quarter") || "Q4";

  // Validate city parameter
  if (!city || city.toLowerCase() !== "pune") {
    return NextResponse.json(
      {
        error: "Invalid city parameter. Currently only Pune is supported.",
        supportedCities: ["Pune"],
      },
      { status: 400 }
    );
  }

  // If no year specified, return all available data
  if (!year) {
    return NextResponse.json({
      city: "Pune",
      data: PUNE_PRICE_DATA.map((entry) => ({
        year: entry.year,
        quarter: entry.quarter,
        priceIndex: entry.priceIndex,
        unit: "NHB Residex",
        source: "https://nhb.org.in/residex",
      })),
      meta: {
        description: "NHB RESIDEX quarterly price index for Pune",
        baseYear: 2015,
        lastUpdated: "2024-01-15",
      },
    });
  }

  // Find data for specific year
  const yearNum = parseInt(year);
  const priceData = PUNE_PRICE_DATA.find((entry) => entry.year === yearNum);

  if (!priceData) {
    return NextResponse.json(
      {
        error: `No data available for year ${year}`,
        availableYears: PUNE_PRICE_DATA.map((entry) => entry.year),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    city: "Pune",
    year: yearNum,
    quarter: quarter,
    priceIndex: priceData.priceIndex,
    unit: "NHB Residex",
    source: "https://nhb.org.in/residex",
    meta: {
      changeFromPreviousYear:
        yearNum > 2015
          ? (
              ((priceData.priceIndex -
                (PUNE_PRICE_DATA.find((e) => e.year === yearNum - 1)
                  ?.priceIndex || 100)) /
                (PUNE_PRICE_DATA.find((e) => e.year === yearNum - 1)
                  ?.priceIndex || 100)) *
              100
            ).toFixed(2) + "%"
          : "N/A",
      changeFromBase:
        (((priceData.priceIndex - 100) / 100) * 100).toFixed(2) + "%",
    },
  });
}
