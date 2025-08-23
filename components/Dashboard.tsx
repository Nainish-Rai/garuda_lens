"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  AlertTriangle,
  Droplets,
  MapPin,
  Calendar,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancedQueryResult } from "@/lib/types";

interface DashboardProps {
  queryResult?: EnhancedQueryResult | null;
  className?: string;
}

// Color schemes for charts
const COLORS = {
  primary: "#0ea5e9",
  secondary: "#84cc16",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
  info: "#6366f1",
  muted: "#6b7280",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.warning,
  COLORS.danger,
  COLORS.success,
  COLORS.info,
];

export default function Dashboard({ queryResult, className }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [narrativeSummary, setNarrativeSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Process query result into dashboard data
  useEffect(() => {
    if (queryResult) {
      processDashboardData(queryResult);
    }
  }, [queryResult]);

  const processDashboardData = (data: EnhancedQueryResult) => {
    setLoading(true);

    // Extract insights from query result
    const polygons = data.polygons || [];

    // Process property data
    const propertyData = polygons.map((polygon, index) => ({
      name: polygon.properties.name || `Area ${index + 1}`,
      priceChange: polygon.properties.priceChange || 0,
      floodRisk: polygon.properties.floodRisk || 0,
      area: polygon.properties.area || "Unknown",
      ward: polygon.properties.ward || "Unknown",
      population: polygon.properties.population || 0,
      avgPropertyValue: polygon.properties.avgPropertyValue || "N/A",
    }));

    // Generate time series data (mock for demonstration)
    const timeSeriesData = Array.from({ length: 12 }, (_, i) => ({
      month: `${2024 - Math.floor(i / 12)}-${String((i % 12) + 1).padStart(
        2,
        "0"
      )}`,
      avgPrice: Math.floor(Math.random() * 100000) + 500000,
      riskScore: Math.floor(Math.random() * 100),
      transactions: Math.floor(Math.random() * 50) + 10,
    }));

    // Risk distribution data
    const riskDistribution = [
      {
        name: "Low Risk",
        value: polygons.filter((p) => (p.properties.floodRisk || 0) < 25)
          .length,
        color: COLORS.success,
      },
      {
        name: "Medium Risk",
        value: polygons.filter(
          (p) =>
            (p.properties.floodRisk || 0) >= 25 &&
            (p.properties.floodRisk || 0) < 50
        ).length,
        color: COLORS.warning,
      },
      {
        name: "High Risk",
        value: polygons.filter((p) => (p.properties.floodRisk || 0) >= 50)
          .length,
        color: COLORS.danger,
      },
    ];

    // Price trend data
    const priceTrendData = propertyData.map((item) => ({
      name: item.name.substring(0, 10) + (item.name.length > 10 ? "..." : ""),
      priceChange: item.priceChange,
      riskScore: item.floodRisk,
    }));

    // Generate narrative summary
    const avgPriceChange =
      propertyData.reduce((sum, item) => sum + item.priceChange, 0) /
      propertyData.length;
    const avgRiskScore =
      propertyData.reduce((sum, item) => sum + item.floodRisk, 0) /
      propertyData.length;
    const highRiskAreas = propertyData.filter((item) => item.floodRisk >= 50);
    const highGrowthAreas = propertyData.filter(
      (item) => item.priceChange >= 30
    );

    const summary = `
Analysis of ${
      propertyData.length
    } areas shows an average property price change of ${avgPriceChange.toFixed(
      1
    )}%
with an average risk score of ${avgRiskScore.toFixed(1)}%.

Key Insights:
• ${highGrowthAreas.length} areas show significant price growth (>30%)
• ${highRiskAreas.length} areas are classified as high-risk zones
• ${
      highGrowthAreas.length > 0
        ? `Top performing area: ${highGrowthAreas[0]?.name} (+${highGrowthAreas[0]?.priceChange}%)`
        : "No high-growth areas identified"
    }
• ${
      highRiskAreas.length > 0
        ? `Highest risk area: ${
            highRiskAreas.sort((a, b) => b.floodRisk - a.floodRisk)[0]?.name
          } (${highRiskAreas[0]?.floodRisk}% risk)`
        : "All areas show low to moderate risk"
    }

${
  avgPriceChange > 20
    ? "The market shows strong growth potential"
    : avgPriceChange > 0
    ? "The market shows moderate growth"
    : "The market shows declining trends"
}
with ${
      avgRiskScore > 50
        ? "high environmental risks"
        : avgRiskScore > 25
        ? "moderate environmental concerns"
        : "relatively low environmental risks"
    }.
    `.trim();

    setDashboardData({
      propertyData,
      timeSeriesData,
      riskDistribution,
      priceTrendData,
      summary: {
        totalAreas: propertyData.length,
        avgPriceChange: avgPriceChange.toFixed(1),
        avgRiskScore: avgRiskScore.toFixed(1),
        highRiskCount: highRiskAreas.length,
        highGrowthCount: highGrowthAreas.length,
      },
    });

    setNarrativeSummary(summary);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center space-y-4">
          <Activity className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            Generating dashboard insights...
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center space-y-4 max-w-md">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            No Data Available
          </h3>
          <p className="text-muted-foreground">
            Submit a query to generate interactive dashboards and insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full overflow-auto bg-background", className)}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive property and risk analysis
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Areas</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData.summary.totalAreas}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Price Change
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData.summary.avgPriceChange}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Risk Score
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData.summary.avgRiskScore}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5 text-danger" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    High Risk Areas
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData.summary.highRiskCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Narrative Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Executive Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-foreground">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {narrativeSummary}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUpIcon className="h-5 w-5" />
                <span>Price Change by Area</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.priceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="priceChange"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChartIcon className="h-5 w-5" />
                <span>Risk Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.riskDistribution.map(
                      (entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Time Series Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Market Trends Over Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Avg Price"
                  />
                  <Line
                    type="monotone"
                    dataKey="riskScore"
                    stroke={COLORS.danger}
                    strokeWidth={2}
                    name="Risk Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk vs Price Correlation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Risk vs Price Correlation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.priceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="priceChange"
                    stackId="1"
                    stroke={COLORS.success}
                    fill={COLORS.success}
                    fillOpacity={0.6}
                    name="Price Change %"
                  />
                  <Area
                    type="monotone"
                    dataKey="riskScore"
                    stackId="2"
                    stroke={COLORS.warning}
                    fill={COLORS.warning}
                    fillOpacity={0.6}
                    name="Risk Score %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>Detailed Area Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium text-foreground">
                      Area
                    </th>
                    <th className="text-left p-2 font-medium text-foreground">
                      Price Change
                    </th>
                    <th className="text-left p-2 font-medium text-foreground">
                      Risk Score
                    </th>
                    <th className="text-left p-2 font-medium text-foreground">
                      Ward
                    </th>
                    <th className="text-left p-2 font-medium text-foreground">
                      Population
                    </th>
                    <th className="text-left p-2 font-medium text-foreground">
                      Avg Property Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.propertyData.map(
                    (area: any, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-2 text-foreground font-medium">
                          {area.name}
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                              area.priceChange >= 30
                                ? "bg-success/20 text-success"
                                : area.priceChange >= 10
                                ? "bg-warning/20 text-warning"
                                : "bg-muted/20 text-muted-foreground"
                            )}
                          >
                            {area.priceChange >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{area.priceChange}%</span>
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                              area.floodRisk >= 50
                                ? "bg-danger/20 text-danger"
                                : area.floodRisk >= 25
                                ? "bg-warning/20 text-warning"
                                : "bg-success/20 text-success"
                            )}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>{area.floodRisk}%</span>
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {area.ward}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {area.population > 0
                            ? `${(area.population / 1000).toFixed(0)}K`
                            : "N/A"}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {area.avgPropertyValue}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
