"use client";

import dynamic from "next/dynamic";

// Import MapInterface dynamically to avoid SSR issues with Leaflet
const MapInterface = dynamic(() => import("@/components/MapInterface"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  return <MapInterface />;
}
