"use client";

import { useEffect, useState } from "react";

interface NovaThinkingProps {
  isVisible: boolean;
  message: string;
}

export function NovaThinking({ isVisible, message }: NovaThinkingProps) {
  const [progress, setProgress] = useState(0);
  const [ringScale, setRingScale] = useState(1);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        return p + Math.random() * 8;
      });
    }, 200);

    // Animate ring pulse
    const ringInterval = setInterval(() => {
      setRingScale((s) => (s === 1 ? 1.08 : 1));
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(ringInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[100]"
      style={{
        background: "rgba(10, 25, 35, 0.85)",
        backdropFilter: "blur(12px)",
        animation: "novaFadeIn 0.4s ease-out",
      }}
    >
      {/* Nova Avatar */}
      <div
        className="relative mb-8"
        style={{
          width: "140px",
          height: "140px",
        }}
      >
        {/* Outer ring - animated */}
        <div
          className="absolute rounded-full"
          style={{
            inset: "-12px",
            border: "4px solid #195969",
            transform: `scale(${ringScale})`,
            transition: "transform 0.4s ease-in-out",
            boxShadow: `0 0 ${30 + progress * 0.5}px rgba(25, 89, 105, 0.8)`,
          }}
        />

        {/* Core */}
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, rgba(25, 89, 105, 0.5), rgba(25, 89, 105, 0.2))",
          }}
        >
          <span
            style={{
              fontSize: "4rem",
              fontWeight: 900,
              color: "#195969",
            }}
          >
            N
          </span>
        </div>

        {/* Scan beam effect */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: `${20 + (progress % 60)}%`,
            height: "4px",
            background: "linear-gradient(90deg, transparent, #195969, #f30349, #195969, transparent)",
            boxShadow: "0 0 25px #195969, 0 0 50px rgba(243, 3, 73, 0.5)",
            opacity: 0.9,
          }}
        />
      </div>

      {/* Status text */}
      <div
        className="flex items-center gap-3 mb-6"
        style={{
          color: "#195969",
          fontSize: "1.5rem",
          fontWeight: 700,
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        {message}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "280px",
          height: "6px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "9999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #195969, #f30349)",
            borderRadius: "9999px",
            transition: "width 0.2s ease-out",
          }}
        />
      </div>

      {/* Pulse dots */}
      <div className="flex items-center gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#195969",
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes novaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
