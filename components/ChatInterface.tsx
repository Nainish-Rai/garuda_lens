"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Copy, ThumbsUp, ThumbsDown, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RealDataAPIClient } from "./QueryProcessor";
import type { EnhancedQueryResult } from "@/lib/types";
import { StreamingText } from "@/components/ui/streaming-text";

// Utility function to generate unique IDs
let messageIdCounter = 0;
const generateMessageId = () => {
  return `msg_${Date.now()}_${++messageIdCounter}`;
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: EnhancedQueryResult;
  isLoading?: boolean;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  initialQuery?: string;
  onMapUpdate?: (data: EnhancedQueryResult) => void;
  className?: string;
}

export default function ChatInterface({
  initialQuery,
  onMapUpdate,
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessedInitialQuery, setHasProcessedInitialQuery] =
    useState(false);

  const handleQuerySubmit = useCallback(
    async (query?: string) => {
      const inputQuery = query || currentInput.trim();
      if (!inputQuery || isProcessing) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: inputQuery,
        timestamp: new Date(),
      };

      const loadingMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "Analyzing your query...",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setCurrentInput("");
      setIsProcessing(true);

      try {
        // Simulate processing stages with updates
        const stages = [
          "Parsing natural language query...",
          "Searching property databases...",
          "Analyzing climate risk data...",
          "Generating insights...",
        ];

        for (let i = 0; i < stages.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? { ...msg, content: stages[i] }
                : msg
            )
          );
        }

        // Get actual data from API
        let result;
        try {
          result = await RealDataAPIClient.queryNaturalLanguageAPI(inputQuery);
        } catch (apiError) {
          console.warn("API call failed, using fallback data:", apiError);
          // Create a fallback response for testing
          result = {
            polygons: [
              {
                id: "test-ward-1",
                coordinates: [
                  [
                    [73.8567, 18.5204],
                    [73.8667, 18.5204],
                    [73.8667, 18.5304],
                    [73.8567, 18.5304],
                    [73.8567, 18.5204],
                  ],
                ],
                properties: {
                  name: "Test Ward",
                  priceChange: 35,
                  floodRisk: 45,
                  area: "Test Area",
                  population: 50000,
                  avgPropertyValue: "₹75,00,000",
                  ward: "Test Ward",
                  city: "Pune",
                },
              },
            ],
            summary: {
              totalAreas: 1,
              avgPriceIncrease: 35,
              avgFloodRiskIncrease: 45,
              timeRange: "2015-2024",
              totalPopulation: 50000,
            },
            insights: [
              "✅ Chat interface is working correctly - this is demonstration data.",
              "⚠️ Real API data unavailable - likely due to missing environment configuration.",
              "💡 To get real data: Create a .env.local file with API keys (see API_SETUP.md).",
              "🔍 For development: This fallback data allows you to test all UI features.",
            ],
            city: "Pune",
            dataSource: {
              propertyData: "Test Data Source",
              riskData: "Test Risk Data",
              boundaryData: "Test Boundary Data",
            },
            meta: {
              queryProcessed: inputQuery,
              resultsCount: 1,
              aiProcessed: true,
              geminiUsed: false,
            },
          };
        }

        // Create response with insights
        const insights = result.insights || [];
        const responseContent = `Based on your query, I found ${
          result.summary?.totalAreas || 0
        } areas that match your criteria.

**Key Findings:**
${insights.map((insight) => `• ${insight}`).join("\n")}

**Summary:**
- Average price increase: ${result.summary?.avgPriceIncrease || 0}%
- Average flood risk: ${result.summary?.avgFloodRiskIncrease || 0}%
- Time period: ${result.summary?.timeRange || "Recent years"}
${
  result.summary?.totalPopulation
    ? `- Population affected: ${(result.summary.totalPopulation / 1000).toFixed(
        0
      )}K`
    : ""
}

The map has been updated to highlight the relevant areas. You can explore the detailed analysis in the map view.`;

        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          data: result,
          isStreaming: true,
        };

        // Replace loading message with streaming message
        setMessages((prev) =>
          prev
            .filter((msg) => msg.id !== loadingMessage.id)
            .concat(assistantMessage)
        );

        // Update map with new data
        onMapUpdate?.(result);
      } catch (error) {
        console.error("Query processing failed:", error);

        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: `I apologize, but I encountered an error while processing your query: ${
            error instanceof Error ? error.message : "Unknown error"
          }.

**Possible solutions:**
• The application may need API keys configured for full functionality
• Try a simpler query like "Show me wards in Pune with high property values"
• Check the browser console for more detailed error information

**Note:** The application should work with demo data even without API keys. If this persists, there may be a configuration issue.`,
          timestamp: new Date(),
        };

        setMessages((prev) =>
          prev
            .filter((msg) => msg.id !== loadingMessage.id)
            .concat(errorMessage)
        );
      }

      setIsProcessing(false);
    },
    [currentInput, isProcessing, onMapUpdate]
  );

  // Process initial query if provided
  useEffect(() => {
    if (initialQuery && messages.length === 0 && !hasProcessedInitialQuery) {
      setHasProcessedInitialQuery(true);
      handleQuerySubmit(initialQuery);
    }
  }, [
    initialQuery,
    messages.length,
    hasProcessedInitialQuery,
    handleQuerySubmit,
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "flex flex-col h-full bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions about property trends and climate risks
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to help!</h3>
              <p className="text-muted-foreground text-sm">
                Start by asking a question about property trends or climate
                risks.
              </p>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-full group"
              >
                <div className="flex gap-3 w-full">
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {message.role === "user" ? "U" : "AI"}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 space-y-2">
                    <div
                      className={cn(
                        "rounded-lg p-3 max-w-none break-words",
                        message.role === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-secondary text-foreground"
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{message.content}</span>
                        </div>
                      ) : message.isStreaming ? (
                        <StreamingText
                          text={message.content}
                          speed={3}
                          interval={30}
                          onComplete={() => {
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === message.id
                                  ? { ...msg, isStreaming: false }
                                  : msg
                              )
                            );
                          }}
                        />
                      ) : message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {message.content.split("\n").map((line, i) => (
                            <p key={i} className="mb-2 last:mb-0">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div>{message.content}</div>
                      )}
                    </div>

                    {/* Actions for assistant messages */}
                    {message.role === "assistant" && !message.isLoading && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuerySubmit();
                }
              }}
              placeholder="Ask about property trends, climate risks, or market analysis..."
              className="resize-none min-h-[44px] max-h-[120px]"
              disabled={isProcessing}
            />
          </div>
          <Button
            onClick={() => handleQuerySubmit()}
            disabled={!currentInput.trim() || isProcessing}
            size="sm"
            className="h-11 px-4"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
