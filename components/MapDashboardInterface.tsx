"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, BarChart3, Activity, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import MapInterface from "./MapInterface";
import Dashboard from "./Dashboard";
import type { EnhancedQueryResult } from "@/lib/types";

interface MapDashboardInterfaceProps {
  queryResult?: EnhancedQueryResult | null;
  className?: string;
}

export default function MapDashboardInterface({
  queryResult,
  className,
}: MapDashboardInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"map" | "dashboard">("map");

  return (
    <div className={cn("w-full h-full bg-background", className)}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "map" | "dashboard")}
        className="w-full h-full flex flex-col"
      >
        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="px-6 py-[22px] flex items-center">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/30 border border-border/50">
              <TabsTrigger
                value="map"
                className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Map className="h-4 w-4" />
                <span className="font-medium">Map View</span>
              </TabsTrigger>
              <TabsTrigger
                value="dashboard"
                className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Status Indicators */}
            <div className=" flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-200",
                    queryResult ? "bg-success animate-pulse" : "bg-muted"
                  )}
                />
                <span>
                  {queryResult
                    ? `${queryResult.polygons?.length || 0} areas loaded`
                    : "No data available"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-3 w-3" />
                <span>
                  {activeTab === "map"
                    ? "Interactive mapping"
                    : "Live analytics"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <TabsContent
              key="map-tab"
              value="map"
              className="h-full m-0 focus-visible:outline-none"
            >
              <motion.div
                key="map-content"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full"
              >
                <MapInterface queryResult={queryResult} className="h-full" />
              </motion.div>
            </TabsContent>

            <TabsContent
              key="dashboard-tab"
              value="dashboard"
              className="h-full m-0 focus-visible:outline-none"
            >
              <motion.div
                key="dashboard-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full"
              >
                <Dashboard queryResult={queryResult} className="h-full" />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>

      {/* Quick Switch Floating Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="absolute bottom-6 right-6 z-20"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() =>
            setActiveTab(activeTab === "map" ? "dashboard" : "map")
          }
          className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-border/20"
          title={`Switch to ${activeTab === "map" ? "Dashboard" : "Map"} View`}
        >
          {activeTab === "map" ? (
            <BarChart3 className="h-5 w-5" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
