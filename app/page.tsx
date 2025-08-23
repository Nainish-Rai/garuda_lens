"use client";

import dynamic from "next/dynamic";

// Import AppContainer dynamically to avoid SSR issues
const AppContainer = dynamic(() => import("@/components/AppContainer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-lg text-muted-foreground">
        Loading application...
      </div>
    </div>
  ),
});

export default function Home() {
  return <AppContainer />;
}
