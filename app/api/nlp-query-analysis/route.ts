import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface QueryAnalysisRequest {
  query: string;
  chatHistory: Array<{
    role: "user" | "assistant";
    content: string;
    data?: unknown;
  }>;
  currentLocation?: string;
  currentAnalysisType?: string;
}

interface QueryAnalysisResponse {
  isNewLocationQuery: boolean;
  isFollowUpQuestion: boolean;
  extractedLocation?: string;
  analysisType?: string;
  intent: string;
  confidence: number;
  followUpResponse?: string;
  requiresNewAnalysis: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryAnalysisRequest = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(await analyzeFallback(body), { status: 200 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const analysisResult = await analyzeQueryWithAI(model, body);

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("NLP query analysis error:", error);

    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await analyzeFallback(body), { status: 500 });
  }
}

async function analyzeQueryWithAI(
  model: GoogleGenerativeAI["getGenerativeModel"] extends (
    ...args: any[]
  ) => infer R
    ? R
    : any,
  body: QueryAnalysisRequest
): Promise<QueryAnalysisResponse> {
  const chatContext = body.chatHistory
    .slice(-6) // Last 6 messages for context
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const prompt = `
You are an expert NLP analyst for a satellite imagery analysis system. Analyze the user's query to determine if it requires new satellite analysis or is a follow-up question.

CURRENT CONTEXT:
- Current Location: ${body.currentLocation || "None"}
- Current Analysis Type: ${body.currentAnalysisType || "None"}

RECENT CHAT HISTORY:
${chatContext}

NEW USER QUERY: "${body.query}"

ANALYSIS TASK:
Determine if this query is:
1. **New Location Query**: Mentions a new geographical location requiring satellite analysis
2. **Follow-up Question**: Asks about previous analysis results without mentioning new locations

LOCATION EXTRACTION RULES:
- Extract the COMPLETE, SPECIFIC location mentioned in the query
- Handle complex patterns and preserve the full location context:
  * "detect urban expansion near infosys pune" → "infosys pune"
  * "deforestation around mumbai airport" → "mumbai airport"
  * "changes in central park new york" → "central park new york"
  * "satellite analysis of bangalore tech corridor" → "bangalore tech corridor"
  * "urbanization near wipro hyderabad" → "wipro hyderabad"
  * "forest loss in amazon rainforest brazil" → "amazon rainforest brazil"
- Look for: city names, landmarks, company locations, geographical features, coordinates, compound locations
- PRESERVE the full context - don't just extract the city name if there's more specific information
- Examples of what to extract:
  * "infosys pune" (not just "pune")
  * "mumbai airport" (not just "mumbai")
  * "amazon rainforest" (not just "amazon")
  * "central delhi" (not just "delhi")
- Ignore: pronouns like "this area", "there", "here" unless no prior context exists

ANALYSIS TYPE DETECTION:
- "deforestation", "forest loss", "tree cover", "woodland clearing" → "deforestation"
- "urbanization", "urban growth", "city expansion", "development", "construction" → "urbanization"
- "change detection", "land use change", "environmental change", "satellite analysis" → "change_detection"
- If multiple types mentioned, prioritize the most specific one

FOLLOW-UP PATTERNS:
- Questions about statistics: "What's the percentage?", "How much area changed?", "Show me the stats"
- Clarifications: "Can you explain more?", "What does this mean?", "Tell me more about this"
- Comparisons: "How does this compare?", "What about other areas?", "Is this normal?"
- Deeper insights: "What are the implications?", "What causes this?", "Why is this happening?"

RESPONSE FORMAT (JSON):
{
  "isNewLocationQuery": boolean,
  "isFollowUpQuestion": boolean,
  "extractedLocation": "exact location string extracted from query or null",
  "analysisType": "deforestation|urbanization|change_detection|null",
  "intent": "brief description of user intent",
  "confidence": 0.0-1.0,
  "followUpResponse": "response text if follow-up, null if new analysis needed",
  "requiresNewAnalysis": boolean
}

IMPORTANT DECISION LOGIC:
- If ANY specific location is mentioned (even with current context) → isNewLocationQuery = true, requiresNewAnalysis = true
- If NO new location AND current location exists AND query asks about previous results → isFollowUpQuestion = true, requiresNewAnalysis = false
- For extractedLocation: provide the EXACT, COMPLETE location string from the query
- Set confidence high (0.8+) for clear patterns, lower (0.6-0.7) for ambiguous cases

FOLLOW-UP RESPONSE GUIDELINES:
If it's a follow-up question, provide a conversational response based on the chat context about the previous analysis. Reference specific data points, explain implications, or provide additional insights about the current location's analysis.

Be conversational and informative, building on the previous analysis context. Keep the response short and engaging and to the point. Interesting to read and understand. Don't be diplomatic. Be a good advisor and give your honest opinion. dont tell user to research more or ask an expert. Provide the best possible answer based on the previous analysis.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      return {
        isNewLocationQuery: Boolean(analysis.isNewLocationQuery),
        isFollowUpQuestion: Boolean(analysis.isFollowUpQuestion),
        extractedLocation: analysis.extractedLocation || null,
        analysisType: analysis.analysisType || null,
        intent: analysis.intent || "Query analysis",
        confidence: Math.max(
          0,
          Math.min(1, Number(analysis.confidence) || 0.5)
        ),
        followUpResponse: analysis.followUpResponse || null,
        requiresNewAnalysis: Boolean(analysis.requiresNewAnalysis),
      };
    }

    throw new Error("Failed to parse AI response");
  } catch (error) {
    console.error("AI analysis failed:", error);
    return await analyzeFallback(body);
  }
}

async function analyzeFallback(
  body: QueryAnalysisRequest
): Promise<QueryAnalysisResponse> {
  const query = body.query.toLowerCase();
  const originalQuery = body.query; // Keep original case for location extraction
  const hasCurrentLocation = Boolean(body.currentLocation);

  // Enhanced location extraction function
  function extractLocation(text: string): string | null {
    const lowerText = text.toLowerCase();
    const originalText = text;

    // Pattern 1: "near/around/in [location]" - Enhanced to capture more context
    const nearPatterns = [
      /(?:near|around|in|at|of)\s+([a-zA-Z\s]+?)(?:\s+(?:from|between|since)|$|,|\?|!)/i,
      /(?:deforestation|urbanization|changes?|expansion|development)\s+(?:near|around|in|at|of)\s+([a-zA-Z\s]+?)(?:\s+(?:from|between|since)|$|,|\?|!)/i,
      /(?:detect|analyze|show|monitor)\s+(?:.*?\s+)?(?:near|around|in|at|of)\s+([a-zA-Z\s]+?)(?:\s+(?:from|between|since)|$|,|\?|!)/i,
    ];

    for (const pattern of nearPatterns) {
      const match = originalText.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common non-location words but preserve compound locations
        if (
          ![
            "the",
            "this",
            "that",
            "area",
            "region",
            "place",
            "and",
            "or",
            "with",
          ].includes(location.toLowerCase())
        ) {
          return location;
        }
      }
    }

    // Pattern 2: Company + Location patterns (improved)
    const companyLocationPatterns = [
      /(infosys|wipro|tcs|microsoft|google|apple|facebook|amazon)\s+(pune|mumbai|bangalore|hyderabad|delhi|chennai|kolkata|gurgaon|noida|mysore)/i,
      /(infosys|wipro|tcs)\s+([a-zA-Z]+)/i, // For IT companies with any city
    ];

    for (const pattern of companyLocationPatterns) {
      const match = originalText.match(pattern);
      if (match) {
        return match[0]; // Return full match like "infosys pune"
      }
    }

    // Pattern 3: Enhanced city/location mentions with context
    const cityPatterns = [
      // Indian cities with context
      /(mumbai\s+(?:airport|central|suburban|tech\s+park|financial\s+district)|mumbai)/i,
      /(delhi\s+(?:ncr|central|new\s+delhi|south\s+delhi|airport)|delhi)/i,
      /(bangalore\s+(?:tech\s+corridor|electronic\s+city|airport|whitefield|koramangala)|bangalore)/i,
      /(pune\s+(?:airport|hinjewadi|magarpatta|camp|shivajinagar)|pune)/i,
      /(chennai\s+(?:airport|it\s+corridor|omr|guindy)|chennai)/i,
      /(hyderabad\s+(?:hitec\s+city|gachibowli|airport|secunderabad)|hyderabad)/i,

      // International locations
      /(amazon\s+(?:rainforest|forest|basin)|amazon)/i,
      /(central\s+park\s+new\s+york|new\s+york)/i,
      /(london\s+(?:city|downtown|airport)|london)/i,
      /(tokyo\s+(?:bay|metropolitan|shibuya)|tokyo)/i,

      // Geographic features
      /(amazon\s+rainforest\s+brazil|amazon\s+rainforest)/i,
      /(sahara\s+desert|sahara)/i,
      /(himalaya\s+mountains|himalaya)/i,
      /(congo\s+basin|congo)/i,

      // Countries and regions
      /(india|china|usa|america|brazil|russia|canada|australia|europe|africa|asia)/i,

      // Fallback single city names
      /(mumbai|delhi|bangalore|pune|kolkata|chennai|hyderabad|ahmedabad|gurgaon|noida|mysore)/i,
      /(london|paris|tokyo|berlin|sydney|toronto|los\s+angeles|chicago|boston)/i,
    ];

    for (const pattern of cityPatterns) {
      const match = originalText.match(pattern);
      if (match) {
        return match[0]; // Return the full matched location with context
      }
    }

    // Pattern 4: Coordinates
    const coordPattern =
      /lat.*?lon|latitude.*?longitude|\d+\.?\d*[°]?\s*[ns]\s*\d+\.?\d*[°]?\s*[ew]/i;
    const coordMatch = originalText.match(coordPattern);
    if (coordMatch) {
      return coordMatch[0];
    }

    return null;
  }

  // Extract location from query
  const extractedLocation = extractLocation(originalQuery);
  const hasNewLocation = Boolean(extractedLocation);

  // Enhanced follow-up question patterns
  const followUpPatterns = [
    /what.*(percentage|percent|%|statistics|stats)/,
    /how much.*area/,
    /can you explain/,
    /what does.*mean/,
    /tell me more/,
    /what are.*implications/,
    /what causes?/,
    /why is/,
    /how does.*compare/,
    /what about/,
    /(more|additional) (details|information|insights)/,
    /show me (more|details)/,
    /explain (this|that)/,
  ];

  // Only consider it a follow-up if there's a current location AND no new location mentioned
  const isFollowUp =
    hasCurrentLocation &&
    !hasNewLocation &&
    followUpPatterns.some((pattern) => pattern.test(query));

  // Enhanced analysis type detection
  let analysisType = null;
  if (
    query.includes("forest") ||
    query.includes("deforest") ||
    query.includes("tree")
  ) {
    analysisType = "deforestation";
  } else if (
    query.includes("urban") ||
    query.includes("city") ||
    query.includes("development") ||
    query.includes("expansion") ||
    query.includes("growth")
  ) {
    analysisType = "urbanization";
  } else if (
    query.includes("change") ||
    query.includes("detect") ||
    query.includes("monitor") ||
    query.includes("analysis")
  ) {
    analysisType = "change_detection";
  }

  // Generate follow-up response if applicable
  let followUpResponse = null;
  if (isFollowUp && !hasNewLocation) {
    if (
      query.includes("percentage") ||
      query.includes("percent") ||
      query.includes("statistics")
    ) {
      followUpResponse = `Based on the previous analysis of ${body.currentLocation}, I can provide more details about the change percentages. The analysis showed specific metrics about land use transformation in that region. Would you like me to break down the statistics in more detail?`;
    } else if (query.includes("explain") || query.includes("mean")) {
      followUpResponse = `Let me explain the analysis results for ${body.currentLocation} in more detail. The satellite imagery analysis uses advanced machine learning models to detect changes over time. The patterns we observed indicate specific environmental or urban development trends that are important for understanding the region's evolution.`;
    } else if (query.includes("implications") || query.includes("causes")) {
      followUpResponse = `The changes detected in ${body.currentLocation} have several important implications. Environmental changes like these can affect local ecosystems, climate patterns, and human settlements. The causes are typically related to economic development, population growth, agricultural expansion, or natural environmental processes.`;
    } else {
      followUpResponse = `I'd be happy to provide more insights about the ${body.currentLocation} analysis. The satellite data revealed interesting patterns that help us understand how this region is changing over time. What specific aspect would you like me to elaborate on?`;
    }
  }

  return {
    isNewLocationQuery: hasNewLocation,
    isFollowUpQuestion: isFollowUp,
    extractedLocation: extractedLocation || undefined,
    analysisType: analysisType || undefined,
    intent: isFollowUp
      ? "Follow-up question about previous analysis"
      : hasNewLocation
      ? `New ${
          analysisType || "satellite"
        } analysis request for ${extractedLocation}`
      : "General query",
    confidence: 0.8,
    followUpResponse: followUpResponse || undefined,
    requiresNewAnalysis: hasNewLocation,
  };
}
