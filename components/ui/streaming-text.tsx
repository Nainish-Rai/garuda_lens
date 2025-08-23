"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface StreamingTextProps {
  text: string;
  speed?: number; // characters per interval
  interval?: number; // milliseconds between updates
  onComplete?: () => void;
  className?: string;
}

export function StreamingText({
  text,
  speed = 2,
  interval = 50,
  onComplete,
  className = "",
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const timer = setInterval(() => {
      if (currentIndex >= text.length) {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
        return;
      }

      const nextIndex = Math.min(currentIndex + speed, text.length);
      setDisplayedText(text.slice(0, nextIndex));
      currentIndex = nextIndex;
    }, interval);

    return () => clearInterval(timer);
  }, [text, speed, interval, onComplete]);

  return (
    <div className={className}>
      <span>{displayedText}</span>
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-current ml-1"
        />
      )}
    </div>
  );
}

interface TypewriterEffectProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterEffect({
  text,
  speed = 30,
  className = "",
  onComplete,
}: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayText("");
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-current ml-0.5"
        />
      )}
    </span>
  );
}
