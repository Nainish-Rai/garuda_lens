import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface SatelliteAnalysisRequest {
  satelliteData: {
    beforeImage?: string;
    afterImage?: string;
    overlayImage?: string;
    maskImage?: string;
    analysisMetadata: {
      location: string;
      dateRange: [string, string];
      resolution: string;
      algorithm: string;
      analysisDate: string;
    };
  };
  statistics: {
    changePercentage?: number;
    changedPixels?: number;
    totalPixels?: number;
    totalChangeArea?: number;
    [key: string]: any;
  };
  analysisType: string;
  userQuery: string;
  polygonData?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const body: SatelliteAnalysisRequest = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "Gemini AI not configured",
          fallbackInsights: generateFallbackInsights(body),
        },
        { status: 200 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // Prepare context for AI analysis
    const analysisContext = createAnalysisContext(body);

    // Generate insights with image analysis if available
    let insights = "";

    if (body.satelliteData.beforeImage && body.satelliteData.afterImage) {
      // Analyze images with Gemini Vision
      insights = await analyzeWithImages(model, body, analysisContext);
    } else {
      // Analyze without images using statistics only
      insights = await analyzeWithoutImages(model, body, analysisContext);
    }

    return NextResponse.json({
      success: true,
      insights: insights,
      analysisType: body.analysisType,
      location: body.satelliteData.analysisMetadata.location,
      timeRange: body.satelliteData.analysisMetadata.dateRange,
      processingTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI satellite analysis error:", error);

    const body = await request.json().catch(() => ({}));
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
        fallbackInsights: generateFallbackInsights(body),
      },
      { status: 500 }
    );
  }
}

function createAnalysisContext(body: SatelliteAnalysisRequest): string {
  const { satelliteData, statistics, analysisType, userQuery } = body;

  return `
User Query: "${userQuery}"
Analysis Type: ${analysisType}
Location: ${satelliteData.analysisMetadata.location}
Time Period: ${satelliteData.analysisMetadata.dateRange[0]} to ${
    satelliteData.analysisMetadata.dateRange[1]
  }
Resolution: ${satelliteData.analysisMetadata.resolution}
Algorithm: ${satelliteData.analysisMetadata.algorithm}

Statistical Results:
- Change Percentage: ${statistics.changePercentage?.toFixed(2)}%
- Changed Pixels: ${statistics.changedPixels?.toLocaleString()}
- Total Pixels: ${statistics.totalPixels?.toLocaleString()}
- Change Area: ${statistics.totalChangeArea?.toLocaleString()} units

Images Available:
- Before Image: ${body.satelliteData.beforeImage ? "Yes" : "No"}
- After Image: ${body.satelliteData.afterImage ? "Yes" : "No"}
- Overlay/Change Map: ${body.satelliteData.overlayImage ? "Yes" : "No"}
`;
}

async function analyzeWithImages(
  model: any,
  body: SatelliteAnalysisRequest,
  context: string
): Promise<string> {
  try {
    const prompt = `
You are an expert satellite imagery analyst with deep knowledge in environmental science, urban planning, and geospatial analysis.

Analyze the provided satellite images and data to create a natural, conversational response about the changes detected.

${context}

Based on the satellite imagery comparison and statistical data, provide a conversational analysis that:

1. **Opening**: Start with a natural greeting and summary of what you found
2. **Visual Analysis**: Describe what you can observe in the before/after images
3. **Quantitative Insights**: Explain the statistics in human terms
4. **Environmental/Economic Impact**: Discuss real-world implications
5. **Contextual Analysis**: Put the changes in perspective for the specific region
6. **Future Considerations**: Suggest what this might mean going forward

Make it conversational, insightful, and accessible to non-experts. Use emojis sparingly but effectively.
Focus on storytelling - what story do these images and data tell about this place?

If this is deforestation analysis, discuss forest loss, biodiversity impact, carbon implications.
If this is urbanization, discuss development patterns, infrastructure needs, population growth.
If this is general change detection, focus on the most significant transformations observed.

Keep the response engaging and informative, like talking to an intelligent friend who's curious about satellite analysis.


Keep the response short and engaging and to the point. Interesting to read and understand. Don't be diplomatic. Be a good advisor and give your honest opinion.
`;

    // Convert base64 images for Gemini Vision API
    const imageData = [];

    if (body.satelliteData.beforeImage) {
      imageData.push({
        inlineData: {
          data: body.satelliteData.beforeImage.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
          ),
          mimeType: "image/png",
        },
      });
    }

    if (body.satelliteData.afterImage) {
      imageData.push({
        inlineData: {
          data: body.satelliteData.afterImage.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
          ),
          mimeType: "image/png",
        },
      });
    }

    if (body.satelliteData.overlayImage) {
      imageData.push({
        inlineData: {
          data: body.satelliteData.overlayImage.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
          ),
          mimeType: "image/png",
        },
      });
    }

    const result = await model.generateContent([prompt, ...imageData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Image analysis failed:", error);
    return await analyzeWithoutImages(model, body, context);
  }
}

async function analyzeWithoutImages(
  model: any,
  body: SatelliteAnalysisRequest,
  context: string
): Promise<string> {
  const prompt = `
You are an expert satellite imagery analyst. Based on the statistical analysis results, provide a conversational, natural language explanation of the findings.

${context}

Create a friendly, conversational response that explains:

1. **What was detected**: Summarize the changes found
2. **Scale and significance**: Put the numbers in perspective
3. **Regional context**: What this means for the specific location
4. **Implications**: Environmental, economic, or social impacts
5. **Insights**: Your expert interpretation of these changes

Make it sound like you're explaining fascinating findings to a curious friend. Be specific about numbers but translate them into understandable terms.

Example tone: "Hey! I just finished analyzing the satellite data for [location], and here's what I discovered..."

Focus on making the data meaningful and engaging. Use your expertise to provide insights that go beyond just the raw numbers.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

function generateFallbackInsights(body: any): string {
  const changePercentage = body?.statistics?.changePercentage || 0;
  const location =
    body?.satelliteData?.analysisMetadata?.location || "the area";
  const analysisType = body?.analysisType || "change detection";

  if (analysisType === "deforestation") {
    return `I've completed the forest analysis for ${location}! 🌳

The satellite data shows ${changePercentage.toFixed(
      1
    )}% forest cover change in this region. ${
      changePercentage > 10
        ? "This represents significant forest loss that could impact local ecosystems and wildlife habitats. The scale of deforestation suggests active logging or land conversion activities."
        : changePercentage > 3
        ? "There's moderate forest cover reduction, which might be due to selective logging or natural factors. This level of change warrants monitoring."
        : "Forest cover appears relatively stable with minimal changes detected. This suggests good forest management or protection."
    }

The analysis covers ${
      body?.statistics?.totalPixels?.toLocaleString() || "thousands"
    } of pixels, providing detailed coverage of the forest area. This type of monitoring is crucial for conservation efforts and environmental planning.`;
  }

  if (analysisType === "urbanization") {
    return `Great! I've analyzed the urban development patterns for ${location} 🏙️

The data reveals ${changePercentage.toFixed(
      1
    )}% urban expansion in this area. ${
      changePercentage > 15
        ? "This represents rapid urban growth that likely indicates significant economic development and population increase. Such expansion typically requires substantial infrastructure planning."
        : changePercentage > 5
        ? "There's moderate urban development happening, suggesting steady growth and planned expansion. This is often a sign of healthy economic activity."
        : "Urban development appears controlled with minimal expansion. This could indicate mature urban areas or effective growth management policies."
    }

This level of change affects approximately ${
      body?.statistics?.changedPixels?.toLocaleString() || "thousands"
    } of pixels in the analysis area, helping us understand development patterns and future planning needs.`;
  }

  return `I've completed the satellite analysis for ${location}! 🛰️

The data shows ${changePercentage.toFixed(
    1
  )}% land use change in this region. ${
    changePercentage > 10
      ? "This indicates significant landscape transformation that could be due to various factors like development, agriculture, or environmental changes."
      : changePercentage > 2
      ? "There are moderate changes detected, suggesting some ongoing land use activities or natural processes."
      : "The area appears relatively stable with minimal changes, indicating consistent land use patterns."
  }

The high-resolution analysis processed ${
    body?.statistics?.totalPixels?.toLocaleString() || "thousands"
  } of pixels, providing detailed insights into the changing landscape patterns.`;
}
