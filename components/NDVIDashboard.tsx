"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Leaf,
  TrendingUp,
  Activity,
  BarChart3,
  TreePine,
  Building2,
  Droplets,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NDVIAnalysisResult {
  success: boolean;
  location: string;
  coordinates: { latitude: number; longitude: number };
  timeline_start: string;
  timeline_end: string;
  ndvi_analysis: {
    ndvi_statistics: {
      before: {
        mean: number;
        std: number;
        min: number;
        max: number;
        median: number;
      };
      after: {
        mean: number;
        std: number;
        min: number;
        max: number;
        median: number;
      };
      change: {
        mean_change: number;
        std_change: number;
        significant_change_pixels: number;
      };
    };
    change_statistics: {
      total_valid_pixels: number;
      vegetation_gain: { count: number; percentage: number };
      vegetation_loss: { count: number; percentage: number };
      urbanization: { count: number; percentage: number };
      urban_loss: { count: number; percentage: number };
      water_gain: { count: number; percentage: number };
      water_loss: { count: number; percentage: number };
    };
    analysis_focus: string;
  };
  change_analysis: {
    total_change_percentage: number;
    dominant_change: string;
    vegetation_change_net: number;
    urban_change_net: number;
    water_change_net: number;
    change_intensity: string;
  };
  recommendations: string[];
}

interface NDVIDashboardProps {
  ndviData?: NDVIAnalysisResult | null;
  className?: string;
}

const COLORS = {
  vegetation_gain: "#10b981",
  vegetation_loss: "#ef4444",
  urbanization: "#f59e0b",
  urban_loss: "#8b5cf6",
  water_gain: "#06b6d4",
  water_loss: "#dc2626",
  before: "#64748b",
  after: "#0ea5e9",
  change: "#8b5cf6",
};

export default function NDVIDashboard({
  ndviData,
  className,
}: NDVIDashboardProps) {
  if (!ndviData) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-background",
          className
        )}
      >
        <div className="text-center space-y-4 max-w-md">
          <Leaf className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            No NDVI Data Available
          </h3>
          <p className="text-muted-foreground">
            Run an NDVI analysis query to visualize vegetation changes and land
            use patterns.
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Try: &quot;Show NDVI changes in Mumbai from 2020 to 2024&quot;
            </p>
            <p>Or: &quot;Analyze vegetation patterns in Delhi&quot;</p>
          </div>
        </div>
      </div>
    );
  }

  const { ndvi_analysis, change_analysis } = ndviData;

  // Prepare data for charts
  const changeStatisticsData = [
    {
      category: "Vegetation Gain",
      percentage: ndvi_analysis.change_statistics.vegetation_gain.percentage,
      count: ndvi_analysis.change_statistics.vegetation_gain.count,
      color: COLORS.vegetation_gain,
    },
    {
      category: "Vegetation Loss",
      percentage: ndvi_analysis.change_statistics.vegetation_loss.percentage,
      count: ndvi_analysis.change_statistics.vegetation_loss.count,
      color: COLORS.vegetation_loss,
    },
    {
      category: "Urbanization",
      percentage: ndvi_analysis.change_statistics.urbanization.percentage,
      count: ndvi_analysis.change_statistics.urbanization.count,
      color: COLORS.urbanization,
    },
    {
      category: "Urban Loss",
      percentage: ndvi_analysis.change_statistics.urban_loss.percentage,
      count: ndvi_analysis.change_statistics.urban_loss.count,
      color: COLORS.urban_loss,
    },
    {
      category: "Water Gain",
      percentage: ndvi_analysis.change_statistics.water_gain.percentage,
      count: ndvi_analysis.change_statistics.water_gain.count,
      color: COLORS.water_gain,
    },
    {
      category: "Water Loss",
      percentage: ndvi_analysis.change_statistics.water_loss.percentage,
      count: ndvi_analysis.change_statistics.water_loss.count,
      color: COLORS.water_loss,
    },
  ];

  const ndviComparisonData = [
    {
      metric: "Mean NDVI",
      before: ndvi_analysis.ndvi_statistics.before.mean,
      after: ndvi_analysis.ndvi_statistics.after.mean,
      change: ndvi_analysis.ndvi_statistics.change.mean_change,
    },
    {
      metric: "Median NDVI",
      before: ndvi_analysis.ndvi_statistics.before.median,
      after: ndvi_analysis.ndvi_statistics.after.median,
      change:
        ndvi_analysis.ndvi_statistics.after.median -
        ndvi_analysis.ndvi_statistics.before.median,
    },
    {
      metric: "Max NDVI",
      before: ndvi_analysis.ndvi_statistics.before.max,
      after: ndvi_analysis.ndvi_statistics.after.max,
      change:
        ndvi_analysis.ndvi_statistics.after.max -
        ndvi_analysis.ndvi_statistics.before.max,
    },
    {
      metric: "Min NDVI",
      before: ndvi_analysis.ndvi_statistics.before.min,
      after: ndvi_analysis.ndvi_statistics.after.min,
      change:
        ndvi_analysis.ndvi_statistics.after.min -
        ndvi_analysis.ndvi_statistics.before.min,
    },
  ];

  const changeOverviewData = [
    {
      type: "Vegetation Change",
      value: change_analysis.vegetation_change_net,
      color:
        change_analysis.vegetation_change_net > 0
          ? COLORS.vegetation_gain
          : COLORS.vegetation_loss,
    },
    {
      type: "Urban Change",
      value: change_analysis.urban_change_net,
      color:
        change_analysis.urban_change_net > 0
          ? COLORS.urbanization
          : COLORS.urban_loss,
    },
    {
      type: "Water Change",
      value: change_analysis.water_change_net,
      color:
        change_analysis.water_change_net > 0
          ? COLORS.water_gain
          : COLORS.water_loss,
    },
  ];

  const timelineData = [
    {
      period: ndviData.timeline_start.substring(0, 4),
      vegetation: ndvi_analysis.ndvi_statistics.before.mean * 100,
      label: "Before",
    },
    {
      period: ndviData.timeline_end.substring(0, 4),
      vegetation: ndvi_analysis.ndvi_statistics.after.mean * 100,
      label: "After",
    },
  ];

  return (
    <div className={cn("w-full h-full overflow-auto bg-background", className)}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-6 w-6 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                NDVI Vegetation Analysis
              </h1>
              <p className="text-muted-foreground">
                Satellite-powered vegetation change detection for{" "}
                {ndviData.location}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4 text-green-500" />
              <span>NDVI Analysis</span>
            </div>
            <div className="flex items-center gap-1">
              <TreePine className="h-4 w-4" />
              <span>
                {ndviData.timeline_start} - {ndviData.timeline_end}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Change</p>
                  <p className="text-2xl font-bold text-foreground">
                    {change_analysis.total_change_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Vegetation Change
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      change_analysis.vegetation_change_net > 0
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  >
                    {change_analysis.vegetation_change_net > 0 ? "+" : ""}
                    {change_analysis.vegetation_change_net.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Urban Change</p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      change_analysis.urban_change_net > 0
                        ? "text-orange-500"
                        : "text-blue-500"
                    )}
                  >
                    {change_analysis.urban_change_net > 0 ? "+" : ""}
                    {change_analysis.urban_change_net.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Water Change</p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      change_analysis.water_change_net > 0
                        ? "text-blue-500"
                        : "text-red-500"
                    )}
                  >
                    {change_analysis.water_change_net > 0 ? "+" : ""}
                    {change_analysis.water_change_net.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Land Use Change Distribution - Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span>Land Use Change Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={changeStatisticsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="category"
                    className="fill-foreground"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(2)}%`,
                      "Percentage",
                    ]}
                    labelFormatter={(label) => `Change Type: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#10b981"
                    fill="url(#colorGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient
                      id="colorGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* NDVI Values Comparison - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span>NDVI Values Comparison</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ndviComparisonData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="metric"
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value, name) => [
                      Number(value).toFixed(3),
                      name === "before"
                        ? "Before"
                        : name === "after"
                        ? "After"
                        : "Change",
                    ]}
                  />
                  <Bar dataKey="before" fill={COLORS.before} name="Before" />
                  <Bar dataKey="after" fill={COLORS.after} name="After" />
                  <Bar dataKey="change" fill={COLORS.change} name="Change" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Change Overview - Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span>Net Change Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={changeOverviewData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="type"
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      "Net Change",
                    ]}
                  />
                  {changeOverviewData.map((entry, index) => (
                    <Bar
                      key={index}
                      dataKey="value"
                      fill={entry.color}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Timeline Vegetation Trend - Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-green-500" />
                <span>Vegetation Trend Over Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="period"
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    className="fill-foreground"
                    fontSize={12}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}`,
                      "NDVI Index",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="vegetation"
                    stroke="#10b981"
                    fill="url(#vegetationGradient)"
                    strokeWidth={3}
                  />
                  <defs>
                    <linearGradient
                      id="vegetationGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Detailed Change Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-medium text-foreground">
                        Change Type
                      </th>
                      <th className="text-left p-2 font-medium text-foreground">
                        Percentage
                      </th>
                      <th className="text-left p-2 font-medium text-foreground">
                        Pixel Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeStatisticsData.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="p-2 text-foreground font-medium">
                          {item.category}
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-muted/20">
                            {item.percentage.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {item.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>AI Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ndviData.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
                    <div className="text-sm leading-relaxed text-foreground">
                      {recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-500" />
              <span>Analysis Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-foreground mb-2">
                  {change_analysis.change_intensity}
                </div>
                <div className="text-sm text-muted-foreground">
                  Change Intensity
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-foreground mb-2">
                  {change_analysis.dominant_change}
                </div>
                <div className="text-sm text-muted-foreground">
                  Dominant Change
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-foreground mb-2">
                  {ndvi_analysis.change_statistics.total_valid_pixels.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Valid Pixels Analyzed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
