# Garuda Lens - Interactive Map Interface

A Next.js application featuring an intelligent map interface with natural language queries, property price analysis, and climate risk visualization.

## Features

🗺️ **Fullscreen Mapbox Integration** - Interactive map with multiple layer support
🧠 **Natural Language Queries** - AI-powered query processing (e.g., "Show me neighborhoods in Mumbai where property values rose >30% and flood risk increased since 2015")
📊 **Multi-layer Visualization** - Property price heatmaps, climate risk overlays, and boundary data
⏰ **Time Warp Controls** - Interactive time range slider for temporal analysis
📱 **Smart Side Panel** - Evidence-based summaries with stats, insights, and data sources
🎯 **Intelligent Highlighting** - Automatic zoom and highlight of relevant areas

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Mapbox Access Token

1. Sign up for a free [Mapbox account](https://account.mapbox.com/)
2. Get your access token from the [Mapbox Access Tokens page](https://account.mapbox.com/access-tokens/)
3. Create a `.env.local` file in the project root:

```bash
# .env.local
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token-here
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

### Natural Language Queries

The application supports intelligent natural language queries. Here are some examples:

- `"Show me neighborhoods in Mumbai where property values rose >30% and flood risk increased since 2015"`
- `"Find areas in Delhi with property appreciation over 25% since 2020"`
- `"Display neighborhoods with high climate risk and rising property prices"`

### Map Controls

- **Layer Toggle** (top-left): Enable/disable property heatmap, climate risk overlay, and boundaries
- **Time Slider** (bottom): Adjust the time range for analysis (2010-2024)
- **Side Panel**: View detailed results, insights, and data sources

### Map Layers

1. **Property Heatmap** - Color-coded visualization of property price changes
2. **Climate Risk Overlay** - Flood and climate risk indicators
3. **Boundaries** - Administrative and neighborhood boundaries

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Maps**: Mapbox GL JS, React Map GL
- **UI**: Tailwind CSS, shadcn/ui components
- **Icons**: Lucide React

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
