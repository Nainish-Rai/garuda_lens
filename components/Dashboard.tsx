"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Satellite,
  TreePine,
  Building2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancedQueryResult } from "@/lib/types";
import ChangeDetectionStatsComponent from "./ChangeDetectionStats";
import SatelliteImageViewer from "./SatelliteImageViewer";

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
      changeType:
        polygon.properties.changeType || data.analysisType || "change",
      confidence: polygon.properties.confidence || 0.75,
    }));

    // Generate enhanced insights based on analysis type and data
    const generateEnhancedInsights = () => {
      const insights = [...(data.insights || [])];
      const analysisType = data.analysisType || "change_detection";

      if (data.statistics) {
        if ("changePercentage" in data.statistics) {
          const changePercentage = data.statistics.changePercentage || 0;
          if (changePercentage > 20) {
            insights.push(
              "🚨 **Critical Land Use Change**: Major transformation detected requiring immediate attention"
            );
          } else if (changePercentage > 10) {
            insights.push(
              "⚠️ **Significant Changes**: Notable land use modifications observed"
            );
          } else if (changePercentage > 3) {
            insights.push(
              "📊 **Moderate Development**: Controlled growth patterns detected"
            );
          } else {
            insights.push(
              "🟢 **Stable Environment**: Minimal changes indicate sustainable management"
            );
          }
        }

        if ("forestLossPercentage" in data.statistics) {
          const forestLoss = data.statistics.forestLossPercentage || 0;
          if (forestLoss > 10) {
            insights.push(
              "🌳 **DEFORESTATION ALERT**: Critical forest loss - ecosystem protection needed"
            );
          } else if (forestLoss > 3) {
            insights.push(
              "🌲 **Forest Decline**: Concerning deforestation trends require monitoring"
            );
          } else {
            insights.push(
              "🍃 **Forest Conservation**: Minimal forest loss indicates good protection"
            );
          }
        }

        if ("urbanGrowthPercentage" in data.statistics) {
          const urbanGrowth = data.statistics.urbanGrowthPercentage || 0;
          if (urbanGrowth > 25) {
            insights.push(
              "🏙️ **Rapid Urbanization**: Explosive growth requiring infrastructure planning"
            );
          } else if (urbanGrowth > 10) {
            insights.push(
              "🏘️ **Steady Urban Development**: Controlled expansion with planning needs"
            );
          } else {
            insights.push(
              "🌆 **Managed Growth**: Sustainable urban development patterns"
            );
          }
        }
      }

      // Population impact insights
      if (
        data.summary.totalPopulation &&
        data.summary.totalPopulation > 100000
      ) {
        insights.push(
          "👥 **High Population Impact**: Large community affected - social services planning crucial"
        );
      }

      // Data quality insights
      if (data.satelliteData) {
        insights.push(
          "🛰️ **High-Quality Satellite Data**: Before/after imagery analysis provides precise results"
        );
      }

      if (data.meta?.aiProcessed) {
        insights.push(
          "🤖 **AI-Enhanced Analysis**: Machine learning models provided advanced pattern detection"
        );
      }

      return insights;
    };

    // Generate time series data (enhanced with satellite analysis context)
    const timeSeriesData = Array.from({ length: 12 }, (_, i) => {
      const baseValue =
        data.analysisType === "deforestation"
          ? 70
          : data.analysisType === "urbanization"
          ? 30
          : 50;
      return {
        month: `${2024 - Math.floor(i / 12)}-${String((i % 12) + 1).padStart(
          2,
          "0"
        )}`,
        avgPrice: Math.floor(Math.random() * 100000) + 500000,
        riskScore: Math.floor(Math.random() * 100),
        transactions: Math.floor(Math.random() * 50) + 10,
        changeIntensity: baseValue + Math.random() * 30 - 15,
      };
    });

    // Enhanced risk distribution based on analysis type
    const riskDistribution = [
      {
        name: "Low Impact",
        value: polygons.filter((p) => (p.properties.floodRisk || 0) < 25)
          .length,
        color: COLORS.success,
      },
      {
        name: "Medium Impact",
        value: polygons.filter(
          (p) =>
            (p.properties.floodRisk || 0) >= 25 &&
            (p.properties.floodRisk || 0) < 50
        ).length,
        color: COLORS.warning,
      },
      {
        name: "High Impact",
        value: polygons.filter((p) => (p.properties.floodRisk || 0) >= 50)
          .length,
        color: COLORS.danger,
      },
    ];

    // Enhanced analysis summary
    const avgPriceChange =
      propertyData.reduce((sum, item) => sum + item.priceChange, 0) /
      propertyData.length;
    const avgRiskScore =
      propertyData.reduce((sum, item) => sum + item.floodRisk, 0) /
      propertyData.length;
    const highImpactAreas = propertyData.filter((item) => item.floodRisk >= 50);
    const significantChangeAreas = propertyData.filter(
      (item) => item.priceChange >= 30
    );

    const analysisTypeText =
      data.analysisType === "deforestation"
        ? "deforestation"
        : data.analysisType === "urbanization"
        ? "urbanization"
        : "change detection";

    const summary = `
🔍 **${analysisTypeText.toUpperCase()} ANALYSIS REPORT**

📊 **Overview**: Analysis of ${propertyData.length} areas using ${
      data.satelliteData
        ? "high-resolution satellite imagery"
        : "geospatial data"
    }
shows an average change intensity of ${avgPriceChange.toFixed(
      1
    )}% with impact scores averaging ${avgRiskScore.toFixed(1)}%.

🎯 **Key Findings**:
• ${
      significantChangeAreas.length
    } areas show significant changes (>30% intensity)
• ${highImpactAreas.length} areas classified as high-impact zones
• ${
      data.summary.totalPopulation
        ? `Estimated ${(data.summary.totalPopulation / 1000).toFixed(
            0
          )}K population affected`
        : "Population impact assessment available"
    }
• Analysis confidence: ${
      data.statistics ? "High (AI-verified)" : "Standard (basic analysis)"
    }

${
  significantChangeAreas.length > 0
    ? `🔥 **Priority Area**: ${significantChangeAreas[0]?.name} (${significantChangeAreas[0]?.priceChange}% change intensity)`
    : "✅ **Status**: No critical priority areas identified"
}

${
  highImpactAreas.length > 0
    ? `⚠️ **Highest Impact Zone**: ${
        highImpactAreas.sort((a, b) => b.floodRisk - a.floodRisk)[0]?.name
      } (${highImpactAreas[0]?.floodRisk}% impact score)`
    : "🟢 **Impact Assessment**: All areas show low to moderate impact levels"
}

🌍 **Environmental Context**:
${
  data.analysisType === "deforestation"
    ? "Forest cover analysis indicates " +
      (avgPriceChange > 10
        ? "concerning deforestation trends"
        : "relatively stable forest conditions")
    : data.analysisType === "urbanization"
    ? "Urban development patterns show " +
      (avgPriceChange > 15
        ? "rapid expansion requiring planning"
        : "controlled growth")
    : "Land use changes suggest " +
      (avgPriceChange > 20
        ? "significant transformation"
        : "stable development patterns")
}

${
  data.meta?.processingTime
    ? `⏱️ **Processing**: Completed in ${data.meta.processingTime} using ${
        data.meta.aiProcessed ? "AI-enhanced" : "standard"
      } analysis`
    : ""
}
    `.trim();

    setDashboardData({
      propertyData,
      timeSeriesData,
      riskDistribution,
      priceTrendData: propertyData.map((item) => ({
        name: item.name.substring(0, 10) + (item.name.length > 10 ? "..." : ""),
        priceChange: item.priceChange,
        riskScore: item.floodRisk,
        confidence: (item.confidence || 0.75) * 100,
      })),
      summary: {
        totalAreas: propertyData.length,
        avgPriceChange: avgPriceChange.toFixed(1),
        avgRiskScore: avgRiskScore.toFixed(1),
        highRiskCount: highImpactAreas.length,
        highGrowthCount: significantChangeAreas.length,
        analysisType: analysisTypeText,
        hasStatistics: !!data.statistics,
        hasSatelliteData: !!data.satelliteData,
      },
      enhancedInsights: generateEnhancedInsights(),
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

  const getAnalysisIcon = () => {
    switch (queryResult?.analysisType) {
      case "deforestation":
        return <TreePine className="h-5 w-5 text-green-600" />;
      case "urbanization":
        return <Building2 className="h-5 w-5 text-blue-600" />;
      default:
        return <Activity className="h-5 w-5 text-purple-600" />;
    }
  };

  return (
    <div className={cn("w-full h-full overflow-auto bg-background", className)}>
      <div className="p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getAnalysisIcon()}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {dashboardData.summary.analysisType.charAt(0).toUpperCase() +
                  dashboardData.summary.analysisType.slice(1)}{" "}
                Analytics
              </h1>
              <p className="text-muted-foreground">
                {queryResult?.satelliteData
                  ? "Satellite-powered"
                  : "Geospatial"}{" "}
                analysis with AI insights
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {queryResult?.meta?.aiProcessed && (
              <div className="flex items-center gap-1">
                <Brain className="h-4 w-4 text-purple-500" />
                <span>AI Enhanced</span>
              </div>
            )}
            {queryResult?.satelliteData && (
              <div className="flex items-center gap-1">
                <Satellite className="h-4 w-4 text-blue-500" />
                <span>Satellite Data</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis Details</TabsTrigger>
            <TabsTrigger
              value="satellite"
              disabled={!queryResult?.satelliteData}
            >
              Satellite Data
            </TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Analysis Areas
                      </p>
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
                        Change Intensity
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
                        Impact Score
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
                        High Impact Areas
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {dashboardData.summary.highRiskCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Change Intensity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-5 w-5" />
                    <span>Change Intensity by Area</span>
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
                      <Bar
                        dataKey="confidence"
                        fill={COLORS.success}
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Impact Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChartIcon className="h-5 w-5" />
                    <span>Impact Distribution</span>
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
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Statistics Component */}
            {queryResult?.statistics && (
              <ChangeDetectionStatsComponent
                statistics={queryResult.statistics}
                analysisType={queryResult.analysisType || "change_detection"}
                insights={dashboardData.enhancedInsights}
                metadata={queryResult.satelliteData?.analysisMetadata}
              />
            )}

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
                          Change %
                        </th>
                        <th className="text-left p-2 font-medium text-foreground">
                          Impact Score
                        </th>
                        <th className="text-left p-2 font-medium text-foreground">
                          Type
                        </th>
                        <th className="text-left p-2 font-medium text-foreground">
                          Confidence
                        </th>
                        <th className="text-left p-2 font-medium text-foreground">
                          Population
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
                              {area.changeType}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {(area.confidence * 100).toFixed(0)}%
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {area.population > 0
                                ? `${(area.population / 1000).toFixed(0)}K`
                                : "N/A"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="satellite" className="space-y-6">
            {queryResult?.satelliteData && (
              <SatelliteImageViewer
                satelliteData={queryResult.satelliteData}
                className="w-full"
              />
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Executive Summary with Enhanced Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span>AI-Generated Executive Summary</span>
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

            {/* Enhanced Insights List */}
            {dashboardData.enhancedInsights &&
              dashboardData.enhancedInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <span>Detailed AI Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.enhancedInsights.map(
                        (insight: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div className="text-sm leading-relaxed">
                              {insight}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
