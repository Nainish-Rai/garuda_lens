"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import LandingPage from "./LandingPage";
import ChatInterface from "./ChatInterface";
import { ThemeToggle } from "./ThemeToggle";
import type { EnhancedQueryResult } from "@/lib/types";

// Import MapDashboardInterface dynamically to avoid SSR issues with Leaflet
const MapDashboardInterface = dynamic(() => import("./MapDashboardInterface"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-transparent h-full  rounded-lg">
      <div className="text-lg text-muted-foreground">Loading interface...</div>
    </div>
  ),
});

type AppState = "landing" | "chat";

export default function AppContainer() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [mapData, setMapData] = useState<EnhancedQueryResult | null>(null);

  const handleQuerySubmit = (query: string) => {
    setCurrentQuery(query);
    setAppState("chat");
  };

  const handleMapUpdate = (data: EnhancedQueryResult) => {
    setMapData(data);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Theme Toggle - Always visible */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="absolute top-4 right-4 z-50"
      >
        <ThemeToggle />
      </motion.div>

      <AnimatePresence mode="wait">
        {appState === "landing" ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: -20,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="w-full h-full"
          >
            <LandingPage onQuerySubmit={handleQuerySubmit} />
          </motion.div>
        ) : (
          <motion.div
            key="split-layout"
            initial={{
              opacity: 0,
              scale: 1.05,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
              staggerChildren: 0.1,
            }}
            className="w-full h-full"
          >
            {/* Split Layout Container */}
            <div className="flex h-full">
              {/* Left Side - Chat Interface */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                  delay: 0.1,
                }}
                className="w-2/5 h-full border-r border-border/50 bg-card/30 backdrop-blur-sm"
              >
                <ChatInterface
                  initialQuery={currentQuery}
                  onMapUpdate={handleMapUpdate}
                  className="h-full"
                />
              </motion.div>

              {/* Right Side - Map and Dashboard */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                  delay: 0.2,
                }}
                className="flex-1 h-full relative"
              >
                <MapDashboardInterface
                  queryResult={mapData}
                  className="h-full"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Back Button (only visible in split layout) */}
      <AnimatePresence>
        {appState === "chat" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="absolute top-6 left-100 z-40"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setAppState("landing");
                setCurrentQuery("");
                setMapData(null);
              }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-6 py-3 text-sm font-medium text-foreground hover:bg-card/90 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ← New Query
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
