import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import { JobStore } from "@/lib/job-store";

// Intent classification types
interface AnalysisIntent {
  intent:
    | "DEFORESTATION"
    | "URBANIZATION"
    | "CHANGE_DETECTION"
    | "GENTRIFICATION"
    | "UNKNOWN";
  location: string;
  dateRange: [string, string];
  confidence: number;
  extractedParams: {
    priceThreshold?: number;
    riskCriteria?: boolean;
    timeFrame?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required and must be a string" },
        { status: 400 }
      );
    }

    // Generate unique job ID
    const jobId = uuidv4();

    // Initialize job in store
    JobStore.set(jobId, {
      status: "PENDING",
      progress: "Initializing analysis...",
      startTime: Date.now(),
    });

    // Return job info immediately for async processing
    const pollingUrl = `/api/analysis/status/${jobId}`;

    // Start background processing (don't await)
    processAnalysisAsync(jobId, query);

    return NextResponse.json({
      jobId,
      pollingUrl,
      status: "PENDING",
      message: "Analysis started. Use the polling URL to check status.",
    });
  } catch (error) {
    console.error("Analysis endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to start analysis",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Background processing function
async function processAnalysisAsync(jobId: string, query: string) {
  try {
    // Update job status
    const updateJob = (status: string, data?: any, error?: string) => {
      const current = JobStore.get(jobId);
      if (current) {
        JobStore.set(jobId, {
          ...current,
          status: error ? "FAILED" : data ? "COMPLETE" : "PROCESSING",
          progress: status,
          data,
          error,
        });
      }
    };

    updateJob("Classifying query intent with Gemini AI...");

    // 1. Intent Classification using Gemini AI
    const intentResult = await classifyIntent(query);

    updateJob("Intent classified. Delegating to appropriate agent...");

    // 2. Agent Delegation based on intent
    let analysisResult;

    switch (intentResult.intent) {
      case "DEFORESTATION":
        updateJob("Analyzing deforestation patterns...");
        analysisResult = await delegateToDeforestationAgent(intentResult);
        break;

      case "URBANIZATION":
        updateJob("Analyzing urbanization and development patterns...");
        analysisResult = await delegateToUrbanizationAgent(intentResult);
        break;

      case "CHANGE_DETECTION":
        updateJob("Performing satellite change detection analysis...");
        analysisResult = await delegateToChangeDetectionAgent(intentResult);
        break;

      case "GENTRIFICATION":
        updateJob("Analyzing gentrification and socioeconomic patterns...");
        // For now, fallback to existing query processing
        analysisResult = await delegateToGentrificationAgent(intentResult);
        break;

      default:
        updateJob("Processing with general analysis agent...");
        analysisResult = await delegateToGentrificationAgent(intentResult);
    }

    // 3. Final result processing
    updateJob("Finalizing results...", analysisResult);
  } catch (error) {
    console.error(`Analysis failed for job ${jobId}:`, error);
    const current = JobStore.get(jobId);
    if (current) {
      JobStore.set(jobId, {
        ...current,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        progress: "Analysis failed",
      });
    }
  }
}

// Intent classification using Gemini AI
async function classifyIntent(query: string): Promise<AnalysisIntent> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini AI API key not configured");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Analyze this query and classify the intent. Return a JSON object with the following structure:
{
  "intent": "DEFORESTATION" | "URBANIZATION" | "CHANGE_DETECTION" | "GENTRIFICATION" | "UNKNOWN",
  "location": "extracted location name",
  "dateRange": ["start-date", "end-date"],
  "confidence": 0-100,
  "extractedParams": {
    "priceThreshold": number or null,
    "riskCriteria": boolean,
    "timeFrame": "extracted time reference"
  }
}

Classification guidelines:
- DEFORESTATION: queries about forest loss, tree cover reduction, woodland clearing
- URBANIZATION: queries about city expansion, new construction, urban development, infrastructure growth
- CHANGE_DETECTION: general land use changes, before/after comparisons, temporal analysis
- GENTRIFICATION: property values, displacement, socioeconomic changes, climate gentrification

Query: "${query}"

Extract location (city/region), date range (default to 2020-2024 if not specified), and relevant parameters.
Return only valid JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      // Validate and provide defaults
      return {
        intent: parsed.intent || "UNKNOWN",
        location: parsed.location || "Unknown",
        dateRange: parsed.dateRange || ["2020-01-01", "2024-12-31"],
        confidence: parsed.confidence || 50,
        extractedParams: parsed.extractedParams || {},
      };
    } catch (parseError) {
      console.warn(
        "Failed to parse Gemini response, using fallback:",
        parseError
      );
      return createFallbackIntent(query);
    }
  } catch (error) {
    console.warn("Gemini classification failed, using fallback:", error);
    return createFallbackIntent(query);
  }
}

// Fallback intent classification
function createFallbackIntent(query: string): AnalysisIntent {
  const lowerQuery = query.toLowerCase();

  let intent: AnalysisIntent["intent"] = "UNKNOWN";

  if (
    lowerQuery.includes("forest") ||
    lowerQuery.includes("deforest") ||
    lowerQuery.includes("tree")
  ) {
    intent = "DEFORESTATION";
  } else if (
    lowerQuery.includes("urban") ||
    lowerQuery.includes("development") ||
    lowerQuery.includes("construction")
  ) {
    intent = "URBANIZATION";
  } else if (
    lowerQuery.includes("change") ||
    lowerQuery.includes("before") ||
    lowerQuery.includes("after")
  ) {
    intent = "CHANGE_DETECTION";
  } else if (
    lowerQuery.includes("property") ||
    lowerQuery.includes("price") ||
    lowerQuery.includes("gentrification")
  ) {
    intent = "GENTRIFICATION";
  }

  // Extract location
  const cityMatch = lowerQuery.match(
    /\b(pune|mumbai|delhi|bangalore|chennai|kolkata|hyderabad)\b/
  );
  const location = cityMatch
    ? cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1)
    : "Unknown";

  // Extract date range
  const yearMatch = lowerQuery.match(/(\d{4})/);
  const startYear = yearMatch ? yearMatch[1] : "2020";

  return {
    intent,
    location,
    dateRange: [`${startYear}-01-01`, "2024-12-31"],
    confidence: 60,
    extractedParams: {
      priceThreshold: lowerQuery.match(/(\d+)%/)
        ? parseInt(lowerQuery.match(/(\d+)%/)![1])
        : undefined,
      riskCriteria: lowerQuery.includes("risk"),
      timeFrame: yearMatch ? `since ${startYear}` : undefined,
    },
  };
}

// Agent delegation functions (placeholders for now, will be implemented in Phase 2)
async function delegateToDeforestationAgent(intent: AnalysisIntent) {
  // TODO: Implement in Phase 2 - lib/agents/deforestation.ts
  // For now, simulate processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    type: "deforestation_analysis",
    intent,
    message:
      "Deforestation agent not yet implemented. This will connect to the Geospatial Agent API for forest change detection.",
    placeholder: true,
  };
}

async function delegateToUrbanizationAgent(intent: AnalysisIntent) {
  // TODO: Implement in Phase 2 - lib/agents/urbanization.ts
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    type: "urbanization_analysis",
    intent,
    message:
      "Urbanization agent not yet implemented. This will analyze urban development patterns using satellite imagery.",
    placeholder: true,
  };
}

async function delegateToChangeDetectionAgent(intent: AnalysisIntent) {
  // TODO: Implement in Phase 2 - lib/agents/change-detection.ts
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    type: "change_detection_analysis",
    intent,
    message:
      "Change detection agent not yet implemented. This will perform satellite-based land use change analysis.",
    placeholder: true,
  };
}

async function delegateToGentrificationAgent(intent: AnalysisIntent) {
  // Use existing query processing logic as fallback
  try {
    // Call existing API endpoint
    const queryString = `${
      intent.extractedParams.timeFrame || "since 2015"
    } in ${intent.location} where property values ${
      intent.extractedParams.priceThreshold
        ? `rose >${intent.extractedParams.priceThreshold}%`
        : "increased significantly"
    }${intent.extractedParams.riskCriteria ? " and flood risk increased" : ""}`;

    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/gemini-query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryString }),
      }
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      type: "gentrification_analysis",
      intent,
      data,
      placeholer: false,
    };
  } catch (error) {
    console.error("Gentrification agent error:", error);
    return {
      type: "gentrification_analysis",
      intent,
      error: error instanceof Error ? error.message : "Unknown error",
      placeholder: true,
    };
  }
}
