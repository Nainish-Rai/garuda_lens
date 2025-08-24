"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { SatelliteImageData } from "@/lib/types";

interface SatelliteImageViewerProps {
  satelliteData: SatelliteImageData;
  className?: string;
}

export default function SatelliteImageViewer({
  satelliteData,
  className,
}: SatelliteImageViewerProps) {
  const [selectedView, setSelectedView] = useState<
    "before" | "after" | "overlay" | "split"
  >("split");
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);

  const downloadImage = (imageData: string, filename: string) => {
    const link = document.createElement("a");
    const dataUri = imageData.startsWith("data:")
      ? imageData
      : `data:image/png;base64,${imageData}`;
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getImageSrc = (imageData: string) => {
    return imageData.startsWith("data:")
      ? imageData
      : `data:image/png;base64,${imageData}`;
  };

  const resetView = () => {
    setZoomLevel(1);
    setOverlayOpacity(0.7);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Satellite Analysis</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadImage(satelliteData.beforeImage, "before_analysis.png")
              }
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {satelliteData.analysisMetadata.location} •{" "}
          {satelliteData.analysisMetadata.dateRange[0]} to{" "}
          {satelliteData.analysisMetadata.dateRange[1]}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Selection */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedView === "before" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("before")}
          >
            Before
          </Button>
          <Button
            variant={selectedView === "after" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("after")}
          >
            After
          </Button>
          <Button
            variant={selectedView === "overlay" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("overlay")}
          >
            Changes
          </Button>
          <Button
            variant={selectedView === "split" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("split")}
          >
            Split View
          </Button>
        </div>

        {/* Image Display */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden min-h-[400px]">
          {selectedView === "split" && (
            <div className="flex h-[400px]">
              {/* Before Image */}
              <div className="flex-1 relative overflow-hidden">
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm z-10">
                  Before
                </div>
                <img
                  src={getImageSrc(satelliteData.beforeImage)}
                  alt="Before analysis"
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${zoomLevel})` }}
                  onError={(e) => {
                    console.error("Failed to load before image:", e);
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              {/* After Image */}
              <div className="flex-1 relative overflow-hidden border-l-2 border-white">
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm z-10">
                  After
                </div>
                <img
                  src={getImageSrc(satelliteData.afterImage)}
                  alt="After analysis"
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${zoomLevel})` }}
                  onError={(e) => {
                    console.error("Failed to load after image:", e);
                    e.currentTarget.style.display = "none";
                  }}
                />
                {/* Overlay on after image if enabled */}
                {showOverlay && satelliteData.overlayImage && (
                  <img
                    src={getImageSrc(satelliteData.overlayImage)}
                    alt="Change overlay"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      opacity: overlayOpacity,
                      mixBlendMode: "multiply",
                    }}
                    onError={(e) => {
                      console.error("Failed to load overlay image:", e);
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {selectedView === "before" && (
            <div className="h-[400px] relative overflow-hidden">
              <img
                src={getImageSrc(satelliteData.beforeImage)}
                alt="Before analysis"
                className="w-full h-full object-cover"
                style={{ transform: `scale(${zoomLevel})` }}
                onError={(e) => {
                  console.error("Failed to load before image:", e);
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {selectedView === "after" && (
            <div className="h-[400px] relative overflow-hidden">
              <img
                src={getImageSrc(satelliteData.afterImage)}
                alt="After analysis"
                className="w-full h-full object-cover"
                style={{ transform: `scale(${zoomLevel})` }}
                onError={(e) => {
                  console.error("Failed to load after image:", e);
                  e.currentTarget.style.display = "none";
                }}
              />
              {showOverlay && satelliteData.overlayImage && (
                <img
                  src={getImageSrc(satelliteData.overlayImage)}
                  alt="Change overlay"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    opacity: overlayOpacity,
                    mixBlendMode: "multiply",
                  }}
                  onError={(e) => {
                    console.error("Failed to load overlay image:", e);
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
          )}

          {selectedView === "overlay" && satelliteData.overlayImage && (
            <div className="h-[400px] relative overflow-hidden">
              <img
                src={getImageSrc(satelliteData.overlayImage)}
                alt="Change detection overlay"
                className="w-full h-full object-cover"
                style={{ transform: `scale(${zoomLevel})` }}
                onError={(e) => {
                  console.error("Failed to load overlay image:", e);
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {selectedView === "overlay" && !satelliteData.overlayImage && (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <p>No overlay image available</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
              disabled={zoomLevel >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Overlay Controls */}
          {(selectedView === "after" || selectedView === "split") &&
            satelliteData.overlayImage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverlay(!showOverlay)}
                >
                  {showOverlay ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                {showOverlay && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Overlay:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={overlayOpacity}
                      onChange={(e) =>
                        setOverlayOpacity(parseFloat(e.target.value))
                      }
                      className="w-20"
                    />
                    <span className="text-sm min-w-[30px]">
                      {Math.round(overlayOpacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded">
          <div>Resolution: {satelliteData.analysisMetadata.resolution}</div>
          <div>Algorithm: {satelliteData.analysisMetadata.algorithm}</div>
          <div>
            Analysis Date:{" "}
            {new Date(
              satelliteData.analysisMetadata.analysisDate
            ).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
