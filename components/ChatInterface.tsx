"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/ui/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  User,
  Bot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RealDataAPIClient } from "./QueryProcessor";
import type { EnhancedQueryResult } from "@/lib/types";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Process initial query if provided
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleQuerySubmit(initialQuery);
    }
  }, [initialQuery]);

  const handleQuerySubmit = async (query?: string) => {
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
            msg.id === loadingMessage.id ? { ...msg, content: stages[i] } : msg
          )
        );
      }

      // Get actual data from API
      const result = await RealDataAPIClient.queryNaturalLanguageAPI(
        inputQuery
      );

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
      };

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
        content:
          "I apologize, but I encountered an error while processing your query. Please try again with a different question or check your connection.",
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== loadingMessage.id).concat(errorMessage)
      );
    }

    setIsProcessing(false);
  };

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
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="p-4 space-y-4">
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
                >
                  <Message className="group">
                    <MessageAvatar
                      src={message.role === "user" ? "" : ""}
                      alt={message.role}
                      fallback={message.role === "user" ? "U" : "AI"}
                      className={cn(
                        "h-8 w-8",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    />

                    <div className="flex-1 space-y-2">
                      <MessageContent
                        markdown={message.role === "assistant"}
                        className={cn(
                          "max-w-none",
                          message.role === "user"
                            ? "bg-primary/10 text-foreground"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {message.content}
                          </div>
                        ) : (
                          message.content
                        )}
                      </MessageContent>

                      {message.role === "assistant" && !message.isLoading && (
                        <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageAction tooltip="Copy response">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </MessageAction>

                          <MessageAction tooltip="Good response">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                          </MessageAction>

                          <MessageAction tooltip="Poor response">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      )}
                    </div>
                  </Message>
                </motion.div>
              ))
            )}
          </ChatContainerContent>
          <ChatContainerScrollAnchor ref={messagesEndRef} />

          {/* ScrollButton positioned within the chat container */}
          <div className="absolute right-4 bottom-4">
            <ScrollButton className="shadow-lg" />
          </div>
        </ChatContainerRoot>
      </div>

      {/* Input Section */}
      <div className="border-t border-border/50 p-4">
        <PromptInput
          value={currentInput}
          onValueChange={setCurrentInput}
          onSubmit={() => handleQuerySubmit()}
          isLoading={isProcessing}
          className="bg-background border-border"
        >
          <div className="flex items-end gap-2 p-2">
            <div className="flex-1">
              <PromptInputTextarea
                placeholder="Ask about property trends, climate risks, or market analysis..."
                className="resize-none border-none bg-transparent placeholder:text-muted-foreground/60"
              />
            </div>
            <PromptInputActions>
              <Button
                onClick={() => handleQuerySubmit()}
                disabled={!currentInput.trim() || isProcessing}
                size="sm"
                className="h-10 px-4"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </motion.div>
  );
}
