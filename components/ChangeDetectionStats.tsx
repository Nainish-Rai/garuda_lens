"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  MapPin,
  Users,
  TreePine,
  Building2,
} from "lucide-react";
import {
  ChangeDetectionStats,
  DeforestationStats,
  UrbanizationStats,
} from "@/lib/types";

interface ChangeDetectionStatsProps {
  statistics: ChangeDetectionStats | DeforestationStats | UrbanizationStats;
  analysisType: "change_detection" | "deforestation" | "urbanization";
  className?: string;
  insights?: string[];
  metadata?: any;
}

export default function ChangeDetectionStatsComponent({
  statistics,
  analysisType,
  className,
  insights = [],
  metadata,
}: ChangeDetectionStatsProps) {
  const formatArea = (area: number | undefined | null) => {
    if (area == null || isNaN(area)) {
      return "N/A";
    }

    if (area >= 1000000) {
      return `${(area / 1000000).toFixed(1)} km²`;
    } else if (area >= 10000) {
      return `${(area / 10000).toFixed(1)} hectares`;
    } else {
      return `${area.toFixed(0)} m²`;
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num == null || isNaN(num)) {
      return "N/A";
    }
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const safeToFixed = (
    num: number | undefined | null,
    decimals: number = 1
  ) => {
    if (num == null || isNaN(num)) {
      return "0";
    }
    return num.toFixed(decimals);
  };

  const getConfidenceLevel = (percentage: number) => {
    if (percentage >= 90) return { text: "Very High", color: "text-green-600" };
    if (percentage >= 75) return { text: "High", color: "text-blue-600" };
    if (percentage >= 60) return { text: "Medium", color: "text-yellow-600" };
    if (percentage >= 40) return { text: "Low", color: "text-orange-600" };
    return { text: "Very Low", color: "text-red-600" };
  };

  const generateAIInsights = () => {
    const generatedInsights = [];

    if (analysisType === "change_detection") {
      const stats = statistics as ChangeDetectionStats;
      const changePercentage = stats.changePercentage || 0;

      if (changePercentage > 15) {
        generatedInsights.push(
          "🔴 Significant land use changes detected - requires immediate attention"
        );
      } else if (changePercentage > 5) {
        generatedInsights.push(
          "🟡 Moderate changes observed - monitor for trends"
        );
      } else {
        generatedInsights.push(
          "🟢 Minimal changes detected - area appears stable"
        );
      }

      if (stats.changedPixels && stats.totalPixels) {
        const pixelRatio = (stats.changedPixels / stats.totalPixels) * 100;
        if (pixelRatio > 20) {
          generatedInsights.push(
            "📊 High-resolution analysis shows widespread changes"
          );
        }
      }
    }

    if (analysisType === "deforestation") {
      const stats = statistics as DeforestationStats;
      const lossPercentage = stats.forestLossPercentage || 0;

      if (lossPercentage > 10) {
        generatedInsights.push(
          "🌳 Critical forest loss detected - immediate conservation needed"
        );
      } else if (lossPercentage > 3) {
        generatedInsights.push("🌲 Concerning deforestation trends observed");
      } else {
        generatedInsights.push("🍃 Forest cover appears relatively stable");
      }

      if (
        stats.averageTreeDensityChange &&
        stats.averageTreeDensityChange < -5
      ) {
        generatedInsights.push(
          "📉 Tree density significantly reduced - ecosystem impact likely"
        );
      }
    }

    if (analysisType === "urbanization") {
      const stats = statistics as UrbanizationStats;
      const growthPercentage = stats.urbanGrowthPercentage || 0;

      if (growthPercentage > 20) {
        generatedInsights.push(
          "🏙️ Rapid urbanization detected - infrastructure planning crucial"
        );
      } else if (growthPercentage > 5) {
        generatedInsights.push("🏘️ Steady urban development observed");
      }

      if (stats.populationImpact?.estimatedPopulation) {
        const population = stats.populationImpact.estimatedPopulation;
        if (population > 100000) {
          generatedInsights.push(
            "👥 Large population impact - social services planning needed"
          );
        }
      }
    }

    return generatedInsights;
  };

  const allInsights = [...insights, ...generateAIInsights()];

  const renderChangeDetectionStats = (stats: ChangeDetectionStats) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {safeToFixed(stats.changePercentage)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Change Detected
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatArea(stats.totalChangeArea)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Area Changed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Changed Pixels</span>
              <span>
                {formatNumber(stats.changedPixels)} /{" "}
                {formatNumber(stats.totalPixels)}
              </span>
            </div>
            <Progress value={stats.changePercentage || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderDeforestationStats = (stats: DeforestationStats) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TreePine className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {safeToFixed(stats.forestLossPercentage)}%
                </div>
                <div className="text-sm text-muted-foreground">Forest Loss</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatArea(stats.deforestedArea)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Deforested Area
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Original Forest</div>
              <div className="text-lg font-semibold">
                {formatArea(stats.originalForestArea)}
              </div>
              <div className="text-xs text-muted-foreground">
                Baseline coverage
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Remaining Forest</div>
              <div className="text-lg font-semibold text-green-600">
                {formatArea(stats.remainingForestArea)}
              </div>
              <div className="text-xs text-muted-foreground">
                Current coverage
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tree Density Change</span>
              <span className="flex items-center gap-1">
                {(stats.averageTreeDensityChange || 0) > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                {safeToFixed(Math.abs(stats.averageTreeDensityChange || 0))}%
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                Math.abs(stats.averageTreeDensityChange || 0)
              )}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderUrbanizationStats = (stats: UrbanizationStats) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {safeToFixed(stats.urbanGrowthPercentage)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Urban Growth
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatArea(stats.newUrbanArea)}
                </div>
                <div className="text-sm text-muted-foreground">
                  New Urban Area
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Population Impact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div className="text-sm font-medium">Estimated Population</div>
              </div>
              <div className="text-xl font-bold">
                {formatNumber(stats.populationImpact?.estimatedPopulation)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Population Density</div>
              <div className="text-xl font-bold">
                {formatNumber(stats.populationImpact?.populationDensity)}/km²
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Confidence Level</span>
              <span>
                {safeToFixed(
                  (stats.populationImpact?.confidence || 0) * 100,
                  0
                )}
                %
              </span>
            </div>
            <Progress
              value={(stats.populationImpact?.confidence || 0) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Urban Development Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Development Rate</span>
              <span>
                {safeToFixed(stats.urbanGrowthMetrics?.developmentRate)}%
              </span>
            </div>
            <Progress
              value={stats.urbanGrowthMetrics?.developmentRate || 0}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Infrastructure Expansion</span>
              <span>
                {safeToFixed(stats.urbanGrowthMetrics?.infrastructureExpansion)}
                %
              </span>
            </div>
            <Progress
              value={stats.urbanGrowthMetrics?.infrastructureExpansion || 0}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Urban Density Change</span>
              <span className="flex items-center gap-1">
                {(stats.urbanGrowthMetrics?.averageUrbanDensityChange || 0) >
                0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                {safeToFixed(
                  Math.abs(
                    stats.urbanGrowthMetrics?.averageUrbanDensityChange || 0
                  )
                )}
                %
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                Math.abs(
                  stats.urbanGrowthMetrics?.averageUrbanDensityChange || 0
                )
              )}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );

  const getTitle = () => {
    switch (analysisType) {
      case "deforestation":
        return "Deforestation Analysis";
      case "urbanization":
        return "Urbanization Analysis";
      default:
        return "Change Detection Statistics";
    }
  };

  const getIcon = () => {
    switch (analysisType) {
      case "deforestation":
        return <TreePine className="h-5 w-5" />;
      case "urbanization":
        return <Building2 className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getIcon()}
          {getTitle()}
        </CardTitle>
        {metadata && (
          <div className="text-sm text-muted-foreground">
            Analysis Date:{" "}
            {new Date(metadata.analysisDate).toLocaleDateString()} | Resolution:{" "}
            {metadata.resolution} | Algorithm: {metadata.algorithm}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {allInsights.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                AI Analysis Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allInsights.slice(0, 4).map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>{insight}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {statistics && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analysis Confidence</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    let confidence = 75;
                    if ("changePercentage" in statistics) {
                      confidence = statistics.changePercentage
                        ? Math.min(95, 60 + statistics.changePercentage * 2)
                        : 50;
                    } else if ("forestLossPercentage" in statistics) {
                      confidence = statistics.forestLossPercentage
                        ? Math.min(95, 70 + statistics.forestLossPercentage)
                        : 60;
                    } else if ("urbanGrowthPercentage" in statistics) {
                      confidence = statistics.urbanGrowthPercentage
                        ? Math.min(95, 65 + statistics.urbanGrowthPercentage)
                        : 55;
                    }

                    const confidenceInfo = getConfidenceLevel(confidence);
                    return (
                      <>
                        <span
                          className={`text-sm font-semibold ${confidenceInfo.color}`}
                        >
                          {confidenceInfo.text}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({confidence.toFixed(0)}%)
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {analysisType === "deforestation" &&
          renderDeforestationStats(statistics as DeforestationStats)}
        {analysisType === "urbanization" &&
          renderUrbanizationStats(statistics as UrbanizationStats)}
        {analysisType === "change_detection" &&
          renderChangeDetectionStats(statistics as ChangeDetectionStats)}
      </CardContent>
    </Card>
  );
}
