# Garuda Lens: Implementation Plan & Tasks

This document outlines the tasks required to migrate the Garuda Lens application to a serverless architecture using Next.js and live data APIs.

---

## Phase 1: Build the Core API Infrastructure in Next.js

**Goal:** Replace the Python backend with Next.js API routes that orchestrate calls to third-party APIs.

- [ ] **1. Create Central Analysis Endpoint (`app/api/analysis/route.ts`)**

  - [ ] Create the file `app/api/analysis/route.ts`. This will be the main entry point for all analysis requests from the frontend.
  - [ ] The endpoint should accept a `POST` request. The body will contain the user's query, e.g., `{ "query": "Show me deforestation near Mumbai between 2020 and 2022" }`.
  - [ ] **1.1. Intent Classification:**
    - [ ] Call the Gemini AI API with a carefully crafted prompt.
    - [ ] The prompt should instruct the model to return a JSON object containing the `intent` (e.g., `DEFORESTATION`, `URBANIZATION`, `CHANGE_DETECTION`), `location` ("Mumbai"), and `dateRange` (["2020-01-01", "2022-12-31"]).
    - [ ] Add robust error handling for the AI API call.
  - [ ] **1.2. Agent Delegation:**
    - [ ] Based on the `intent` returned by Gemini, use a `switch` statement to delegate the task to the correct agent.
    - [ ] Example: `case 'DEFORESTATION': return deforestationAgent.analyze(location, dateRange);`
    - [ ] Example: `case 'URBANIZATION': return urbanizationAgent.analyze(location, dateRange);`
    - [ ] This step will _not_ wait for the full analysis. Instead, it will trigger the analysis asynchronously.
  - [ ] **1.3. Asynchronous Job Handling:**
    - [ ] **(In `analysis/route.ts`)** Upon receiving a request, generate a unique `jobId` (e.g., using `uuid`).
    - [ ] Trigger the agent analysis in the background (do not `await` the full completion). Vercel's serverless functions will continue running.
    - [ ] Immediately respond to the frontend with `{ jobId: '...', pollingUrl: '/api/analysis/status/...' }`.
    - [ ] We'll need a simple in-memory store or Vercel KV to track job status: `Map<jobId, { status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED', data?: any }>`
    - [ ] **(New Endpoint)** Create `app/api/analysis/status/[jobId]/route.ts`. This `GET` endpoint will check the job store using the `jobId` from the URL and return the current status and data if complete.
  - [ ] **1.4. Return Final Results:** The status endpoint should eventually return the final GeoJSON and statistics once the background job places it in the store.

- [ ] **2. Create Data Fetcher Library (`lib/data-fetchers.ts`)**
  - [ ] Create the file `lib/data-fetchers.ts`.
  - [ ] **2.1. `fetchGeospatialAnalysis()`:**
    - [ ] Implement function to connect to the Geospatial Agent API at `http://localhost:8001`.
    - [ ] Use the `/analyze/location` endpoint for location-based analysis.
    - [ ] Use the `/analyze` endpoint for coordinate-based analysis.
    - [ ] Handle base64 image responses and convert them for frontend display.
    - [ ] Include proper error handling for API connectivity issues.
  - [ ] **2.2. `fetchPopulationData()`:**
    - [ ] Implement function to query **Kontur or WorldPop API**.
    - [ ] The function should accept a GeoJSON polygon and return an estimated population count.
  - [ ] **2.3. `fetchLocationCoordinates()`:**
    - [ ] Wrapper function for the Geospatial Agent's `/locations/coordinates/{location_name}` endpoint.
    - [ ] Convert location names to coordinates for analysis.

---

## Phase 2: Create the "Agents" as Internal Next.js Services

**Goal:** Encapsulate the business logic for each analysis type into modular TypeScript services that leverage the Geospatial Agent API.

- [ ] **1. Change Detection Agent (`lib/agents/change-detection.ts`)**

  - [ ] Create the file `lib/agents/change-detection.ts`.
  - [ ] **1.1. `analyze()` function:**
    - [ ] Takes location and optional date range as input.
    - [ ] Calls the Geospatial Agent API `/analyze/location` or `/analyze` endpoint.
    - [ ] **1.2. Image Processing:**
      - [ ] Process the returned base64 images (before, after, overlay, mask) from the Geospatial Agent.
      - [ ] Convert change detection mask to GeoJSON polygons using appropriate libraries.
      - [ ] Calculate area statistics from the change percentage and pixel data.
    - [ ] Returns GeoJSON polygons of detected changes and calculated statistics.

- [ ] **2. Deforestation Agent (`lib/agents/deforestation.ts`)**

  - [ ] Create the file `lib/agents/deforestation.ts`.
  - [ ] **2.1. `analyze()` function:**
    - [ ] Extends the Change Detection Agent for forest-specific analysis.
    - [ ] Calls `fetchGeospatialAnalysis()` with forest-optimized parameters.
    - [ ] **2.2. Forest Change Classification:**
      - [ ] Use the change detection mask to identify deforested areas.
      - [ ] Apply forest-specific filters to distinguish deforestation from other land use changes.
      - [ ] Calculate forest loss area and percentage.
    - [ ] Returns GeoJSON of deforested areas and forest loss statistics.

- [ ] **3. Urbanization Agent (`lib/agents/urbanization.ts`)**

  - [ ] Create the file `lib/agents/urbanization.ts`.
  - [ ] **3.1. `analyze()` function:**
    - [ ] Extends the Change Detection Agent for urban development analysis.
    - [ ] Calls `fetchGeospatialAnalysis()` to get before/after satellite imagery.
    - [ ] **3.2. Urban Change Detection:**
      - [ ] Use the overlay and mask images to identify new urban construction.
      - [ ] Filter changes to focus on urban development patterns.
    - [ ] **3.3. Population Estimation:**
      - [ ] Call `fetchPopulationData()` with the new urban area polygons to estimate affected population.
      - [ ] Calculate urban growth statistics and population impact.
    - [ ] Returns GeoJSON of new urban areas and population impact statistics.

- [ ] **4. Multi-Location Analysis Agent (`lib/agents/batch-analysis.ts`)**
  - [ ] Create the file `lib/agents/batch-analysis.ts`.
  - [ ] **4.1. `analyzeBatch()` function:**
    - [ ] Uses the Geospatial Agent's `/analyze/batch` endpoint for multiple locations.
    - [ ] Handles batch job status polling using `/analyze/batch/{batch_id}`.
    - [ ] **4.2. Results Aggregation:**
      - [ ] Combine results from multiple locations into a single analysis report.
      - [ ] Generate comparative statistics across different regions.
    - [ ] Returns aggregated GeoJSON and comparative statistics.

---

## Phase 3: Enhance the Frontend for a Seamless Experience

**Goal:** Adapt the user interface to handle asynchronous, long-running analysis jobs and display satellite imagery.

- [ ] **1. Update `MapInterface.tsx` (`components/MapInterface.tsx`)**

  - [ ] **1.1. API Call:** Modify `handleQuery` to `POST` to the new `/api/analysis` endpoint.
  - [ ] **1.2. Update Loading State:**
    - [ ] Use the `isQuerying` state to show more descriptive loading messages (e.g., "Classifying query...", "Analyzing satellite imagery...", "Processing change detection...").
    - [ ] Add progress indicators for long-running satellite analysis.
  - [ ] **1.3. Implement Polling:**
    - [ ] On receiving a `pollingUrl` from the API, start a `setInterval` or use a library like `react-query` to poll the status endpoint.
    - [ ] Stop polling when the job is complete or has failed.
    - [ ] Update the UI with the final data once received.
  - [ ] **1.4. Satellite Image Display:**
    - [ ] Add image display components for before/after satellite imagery.
    - [ ] Implement overlay toggle functionality for change detection visualization.
    - [ ] Add image download functionality using the base64 data.

- [ ] **2. Enhanced Data Rendering Components**

  - [ ] **2.1. Create `SatelliteImageViewer.tsx`:**
    - [ ] Component to display before/after satellite images side by side.
    - [ ] Include overlay toggle for change detection visualization.
    - [ ] Add zoom and pan functionality for detailed inspection.
  - [ ] **2.2. Create `ChangeDetectionStats.tsx`:**
    - [ ] Component to display change detection statistics.
    - [ ] Show change percentage, affected area, and other metrics.
    - [ ] Include visual charts for better data presentation.
  - [ ] **2.3. Update `EnhancedQueryResult` Type:**
    - [ ] Extend the type to include satellite imagery data.
    - [ ] Add fields for before/after images, change masks, and statistics.
    - [ ] Ensure compatibility with the Geospatial Agent API response format.

- [ ] **3. Error Handling and User Experience**
  - [ ] **3.1. Geospatial Agent Connectivity:**
    - [ ] Add error handling for when the Geospatial Agent API is unavailable.
    - [ ] Implement fallback messages and retry mechanisms.
  - [ ] **3.2. Analysis Limitations:**
    - [ ] Add user guidance for optimal analysis parameters (zoom levels, resolutions).
    - [ ] Implement validation for location queries and date ranges.
    - [ ] Show available dates for specific locations using the `/locations/dates` endpoint.

---

## Phase 4: Integration and Testing

**Goal:** Ensure all components work together seamlessly and handle edge cases.

- [ ] **1. API Integration Testing**

  - [ ] Test all analysis agents with the Geospatial Agent API.
  - [ ] Verify image processing and GeoJSON conversion accuracy.
  - [ ] Test batch analysis functionality with multiple locations.

- [ ] **2. Frontend Integration**

  - [ ] Test the complete user journey from query to results display.
  - [ ] Verify satellite image rendering and overlay functionality.
  - [ ] Test polling mechanism and job status updates.

- [ ] **3. Performance Optimization**

  - [ ] Optimize image loading and caching for satellite imagery.
  - [ ] Implement efficient polling intervals to balance responsiveness and API usage.
  - [ ] Add compression for large image datasets.

- [ ] **4. Documentation and Configuration**
  - [ ] Document the Geospatial Agent API integration.
  - [ ] Create configuration files for API endpoints and parameters.
  - [ ] Add environment variables for API URLs and authentication.
