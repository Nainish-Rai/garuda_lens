import { NextRequest, NextResponse } from "next/server";

// Mock climate risk data for Pune wards with flood risk levels
const PUNE_WARD_RISK_DATA = [
  {
    ward: "Kothrud",
    coordinates: [18.5074, 73.8077],
    riskData: [
      { year: 2015, floodRiskLevel: "Low", riskScore: 0.3 },
      { year: 2016, floodRiskLevel: "Low", riskScore: 0.32 },
      { year: 2017, floodRiskLevel: "Moderate", riskScore: 0.38 },
      { year: 2018, floodRiskLevel: "Moderate", riskScore: 0.42 },
      { year: 2019, floodRiskLevel: "Moderate", riskScore: 0.45 },
      { year: 2020, floodRiskLevel: "Moderate", riskScore: 0.55 },
      { year: 2021, floodRiskLevel: "Moderate", riskScore: 0.58 },
      { year: 2022, floodRiskLevel: "High", riskScore: 0.62 },
      { year: 2023, floodRiskLevel: "High", riskScore: 0.68 },
    ],
  },
  {
    ward: "Aundh",
    coordinates: [18.5579, 73.807],
    riskData: [
      { year: 2015, floodRiskLevel: "Low", riskScore: 0.2 },
      { year: 2016, floodRiskLevel: "Low", riskScore: 0.22 },
      { year: 2017, floodRiskLevel: "Low", riskScore: 0.28 },
      { year: 2018, floodRiskLevel: "Moderate", riskScore: 0.35 },
      { year: 2019, floodRiskLevel: "Moderate", riskScore: 0.42 },
      { year: 2020, floodRiskLevel: "Moderate", riskScore: 0.5 },
      { year: 2021, floodRiskLevel: "Moderate", riskScore: 0.52 },
      { year: 2022, floodRiskLevel: "Moderate", riskScore: 0.55 },
      { year: 2023, floodRiskLevel: "High", riskScore: 0.61 },
    ],
  },
  {
    ward: "Koregaon Park",
    coordinates: [18.5362, 73.898],
    riskData: [
      { year: 2015, floodRiskLevel: "Low", riskScore: 0.15 },
      { year: 2016, floodRiskLevel: "Low", riskScore: 0.18 },
      { year: 2017, floodRiskLevel: "Low", riskScore: 0.22 },
      { year: 2018, floodRiskLevel: "Low", riskScore: 0.28 },
      { year: 2019, floodRiskLevel: "Moderate", riskScore: 0.35 },
      { year: 2020, floodRiskLevel: "Moderate", riskScore: 0.42 },
      { year: 2021, floodRiskLevel: "Moderate", riskScore: 0.48 },
      { year: 2022, floodRiskLevel: "Moderate", riskScore: 0.52 },
      { year: 2023, floodRiskLevel: "Moderate", riskScore: 0.58 },
    ],
  },
  {
    ward: "Shivajinagar",
    coordinates: [18.5304, 73.8567],
    riskData: [
      { year: 2015, floodRiskLevel: "Moderate", riskScore: 0.4 },
      { year: 2016, floodRiskLevel: "Moderate", riskScore: 0.43 },
      { year: 2017, floodRiskLevel: "Moderate", riskScore: 0.48 },
      { year: 2018, floodRiskLevel: "High", riskScore: 0.55 },
      { year: 2019, floodRiskLevel: "High", riskScore: 0.62 },
      { year: 2020, floodRiskLevel: "High", riskScore: 0.68 },
      { year: 2021, floodRiskLevel: "High", riskScore: 0.72 },
      { year: 2022, floodRiskLevel: "High", riskScore: 0.78 },
      { year: 2023, floodRiskLevel: "Very High", riskScore: 0.85 },
    ],
  },
  {
    ward: "Viman Nagar",
    coordinates: [18.5679, 73.9143],
    riskData: [
      { year: 2015, floodRiskLevel: "Low", riskScore: 0.25 },
      { year: 2016, floodRiskLevel: "Low", riskScore: 0.28 },
      { year: 2017, floodRiskLevel: "Moderate", riskScore: 0.35 },
      { year: 2018, floodRiskLevel: "Moderate", riskScore: 0.42 },
      { year: 2019, floodRiskLevel: "Moderate", riskScore: 0.48 },
      { year: 2020, floodRiskLevel: "Moderate", riskScore: 0.55 },
      { year: 2021, floodRiskLevel: "High", riskScore: 0.62 },
      { year: 2022, floodRiskLevel: "High", riskScore: 0.68 },
      { year: 2023, floodRiskLevel: "High", riskScore: 0.75 },
    ],
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const ward = searchParams.get("ward");
  const year = searchParams.get("year");

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

  // If no ward specified, return all wards data
  if (!ward) {
    const allWardsData = PUNE_WARD_RISK_DATA.map((wardData) => {
      const latestData = wardData.riskData[wardData.riskData.length - 1];
      return {
        ward: wardData.ward,
        coordinates: wardData.coordinates,
        currentRisk: {
          year: latestData.year,
          floodRiskLevel: latestData.floodRiskLevel,
          riskScore: latestData.riskScore,
        },
        riskTrend: {
          baselineScore: wardData.riskData[0].riskScore,
          currentScore: latestData.riskScore,
          changePercent:
            (
              ((latestData.riskScore - wardData.riskData[0].riskScore) /
                wardData.riskData[0].riskScore) *
              100
            ).toFixed(1) + "%",
        },
      };
    });

    return NextResponse.json({
      city: "Pune",
      wards: allWardsData,
      meta: {
        availableWards: PUNE_WARD_RISK_DATA.map((w) => w.ward),
        dataSource: "https://ffs.india-water.gov.in/",
        lastUpdated: "2024-01-15",
      },
    });
  }

  // Find specific ward data
  const wardData = PUNE_WARD_RISK_DATA.find(
    (w) => w.ward.toLowerCase() === ward.toLowerCase()
  );

  if (!wardData) {
    return NextResponse.json(
      {
        error: `Ward '${ward}' not found`,
        availableWards: PUNE_WARD_RISK_DATA.map((w) => w.ward),
      },
      { status: 404 }
    );
  }

  // If year specified, return data for that year
  if (year) {
    const yearNum = parseInt(year);
    const yearData = wardData.riskData.find((r) => r.year === yearNum);

    if (!yearData) {
      return NextResponse.json(
        {
          error: `No data available for year ${year}`,
          availableYears: wardData.riskData.map((r) => r.year),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      city: "Pune",
      ward: wardData.ward,
      year: yearNum,
      coordinates: wardData.coordinates,
      floodRiskLevel: yearData.floodRiskLevel,
      riskScore: yearData.riskScore,
      unit: "0–1 scale",
      source: "https://ffs.india-water.gov.in/",
      meta: {
        description:
          "Flood risk assessment based on CWC flood hazard maps and PMC GIS data",
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
  return NextResponse.json({
    city: "Pune",
    ward: wardData.ward,
    coordinates: wardData.coordinates,
    historicalData: wardData.riskData,
    currentRisk: wardData.riskData[wardData.riskData.length - 1],
    riskTrend: {
      baselineYear: wardData.riskData[0].year,
      baselineScore: wardData.riskData[0].riskScore,
      currentYear: wardData.riskData[wardData.riskData.length - 1].year,
      currentScore: wardData.riskData[wardData.riskData.length - 1].riskScore,
      totalChange:
        (
          ((wardData.riskData[wardData.riskData.length - 1].riskScore -
            wardData.riskData[0].riskScore) /
            wardData.riskData[0].riskScore) *
          100
        ).toFixed(1) + "%",
    },
    unit: "0–1 scale",
    source: "https://ffs.india-water.gov.in/",
    meta: {
      description:
        "Flood risk assessment based on CWC flood hazard maps and PMC GIS data",
      dataPoints: wardData.riskData.length,
    },
  });
}
