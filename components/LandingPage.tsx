"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/lib/hooks/use-voice-input";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";

interface LandingPageProps {
  onQuerySubmit: (query: string) => void;
  className?: string;
}

export default function LandingPage({
  onQuerySubmit,
  className,
}: LandingPageProps) {
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState("");
  const { transcript, isRecording, toggle } = useVoiceInput();

  React.useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  const handleSubmit = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery && !isSubmitting && trimmedQuery !== lastSubmittedQuery) {
      setIsSubmitting(true);
      setLastSubmittedQuery(trimmedQuery);
      onQuerySubmit(trimmedQuery);
      // Reset after a short delay to prevent rapid re-submission
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "min-h-screen  flex items-center justify-center bg-transparent",
        className
      )}
    >
      {/* background video  */}
      <video
        src="/video.webm"
        autoPlay
        loop
        muted
        className="absolute inset-0 block dark:hidden -z-0 w-full h-full object-cover"
      />
      <video
        src="/video2.webm"
        autoPlay
        loop
        muted
        className="absolute inset-0 hidden dark:block opacity-20 -z-0 w-full h-full object-cover"
      />
      <div className="w-full max-w-4xl z-10 px-6">
        {/* Header Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center">
            <img src="/logo.png" className="w-36 h-36" alt="Garuda Lens Logo" />
            <h1 className="text-5xl md:text-7xl font-semibold dark:bg-gradient-to-r dark:from-foreground dark:via-foreground/90 dark:to-foreground/70 dark:bg-clip-text dark:text-transparent  -ml-6 text-white">
              Garuda Lens
            </h1>
          </div>

          <p className=" text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Analyze vegetation changes, deforestation, and urban development
            using satellite imagery and NDVI analysis.
          </p>
        </motion.div>

        {/* Prompt Input Section */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <PromptInput
            value={query}
            onValueChange={setQuery}
            onSubmit={handleSubmit}
            className=" border-border shadow transition-all duration-300"
          >
            <div className="flex items-end gap-2 p-2">
              <div className="flex-1">
                <PromptInputTextarea
                  placeholder="Analyze NDVI vegetation changes in Mumbai from 2020 to 2024..."
                  className="text-base resize-none border-none bg-transparent placeholder:text-muted-foreground/60 focus:ring-0"
                  maxLength={500}
                />
              </div>
              <PromptInputActions>
                <Button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isSubmitting}
                  size="lg"
                  className="rounded-2xl h-12 px-6 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Analyze
                </Button>
                <Button
                  onClick={toggle}
                  size="icon"
                  className={`rounded-2xl h-12 w-12 ${
                    isRecording ? "bg-red-500" : "bg-white/80"
                  }`}
                >
                  <MicrophoneIcon className="h-6 w-6" />
                </Button>
              </PromptInputActions>
            </div>
          </PromptInput>
        </motion.div>

        {/* Example Prompts */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto mt-12"
        >
          <p className="text-center text-sm text-muted-foreground mb-6">
            Try these examples to get started:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Show NDVI vegetation changes in Mumbai from 2020 to 2024",
              "Analyze development in 'Super Corridor Indore' from 2020 to 2024",
              "Detect urban expansion in Bangalore using satellite imagery",
              "Monitor forest cover changes in Delhi NCR region",
            ].map((example, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                onClick={() => {
                  if (!isSubmitting && example !== lastSubmittedQuery) {
                    setQuery(example);
                    setIsSubmitting(true);
                    setLastSubmittedQuery(example);
                    onQuerySubmit(example);
                    setTimeout(() => setIsSubmitting(false), 500);
                  }
                }}
                disabled={isSubmitting}
                className="text-left p-4 rounded-xl bg-card  border border-border hover:bg-card/50 hover:border-border/50 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary/50 mt-2 group-hover:bg-primary transition-colors" />
                  <span className="leading-relaxed">{example}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
