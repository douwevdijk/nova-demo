"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import type { NovaSummaryData } from "@/lib/realtime-client";

interface NovaSummaryDisplayProps {
  data: NovaSummaryData | null;
  onClose: () => void;
}

// Keywords to highlight in red
const HIGHLIGHT_WORDS = [
  "Randstad", "Noord", "Zuid", "Oost",
  "Noord-Nederland", "Zuid-Nederland",
  "Management", "HR & Talent", "IT & Tech", "Marketing & Sales",
];

// Highlight keywords and percentages using React elements (no dangerouslySetInnerHTML)
function renderHighlighted(text: string): ReactNode[] {
  // Build regex: match percentages, quoted text, or any keyword
  const keywordsEscaped = HIGHLIGHT_WORDS.map(k => k.replace(/[&]/g, "\\&").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(\\d+%|"[^"]+"|${keywordsEscaped.join("|")})`, "g");

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add highlighted match
    parts.push(
      <span key={match.index} style={{ color: "#f30349", fontWeight: 700 }}>
        {match[1]}
      </span>
    );
    lastIndex = pattern.lastIndex;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function NovaSummaryDisplay({ data, onClose }: NovaSummaryDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleLines, setVisibleLines] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);

  const isHighlightsMode = !!(data?.highlights && data.highlights.length > 0);
  const isContentMode = !!(data?.content);

  useEffect(() => {
    if (data && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );

      if (isHighlightsMode) {
        setVisibleLines(0);
        let count = 0;
        const total = data.highlights!.length;
        const interval = setInterval(() => {
          count++;
          setVisibleLines(count);
          if (count >= total) clearInterval(interval);
        }, 350);
        return () => clearInterval(interval);
      }

      if (isContentMode) {
        setTimeout(() => setContentVisible(true), 300);
      }
    }
  }, [data, isHighlightsMode, isContentMode]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "rgba(5, 5, 5, 0.95)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl mx-8"
        style={{
          background: "linear-gradient(145deg, #0d0d0d, #050505)",
          borderRadius: "20px",
          border: "3px solid rgba(243, 3, 73, 0.4)",
          padding: "56px 64px",
          boxShadow: "0 50px 100px rgba(0, 0, 0, 0.8), 0 0 150px rgba(243, 3, 73, 0.15)",
          opacity: 0,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "24px",
            color: "rgba(255, 255, 255, 0.2)",
            background: "none",
            border: "none",
            fontSize: "36px",
            cursor: "pointer",
            transition: "color 0.2s",
            lineHeight: 1,
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.2)")}
        >
          x
        </button>

        {/* Nova avatar + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              background: "#f30349",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "white",
              boxShadow: "0 0 40px rgba(243, 3, 73, 0.6)",
              flexShrink: 0,
            }}
          >
            N
          </div>
          <div>
            <span
              style={{
                color: "#f30349",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {isHighlightsMode ? "NOVA ANALYSE" : "NOVA"}
            </span>
            <h2 style={{ color: "white", fontSize: "1.8rem", fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
              {data.title}
            </h2>
          </div>
        </div>

        {/* MODE 1: Highlights (6 punten) */}
        {isHighlightsMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {data.highlights!.map((line, idx) => {
              if (idx >= visibleLines) return null;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "16px 0",
                    borderBottom: idx < data.highlights!.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                    animation: "highlightSlide 0.5s ease-out both",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: "rgba(243, 3, 73, 0.12)",
                      border: "1px solid rgba(243, 3, 73, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "#f30349",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.9)",
                      fontSize: "1.3rem",
                      fontWeight: 500,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {renderHighlighted(line)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: Content (vrije tekst - universeel) */}
        {isContentMode && !isHighlightsMode && (
          <div
            style={{
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.5s ease-out",
            }}
          >
            {data.content!.split(/\n\n+/).map((paragraph, idx) => (
              <p
                key={idx}
                style={{
                  color: "rgba(255, 255, 255, 0.95)",
                  fontSize: data.content!.length > 500 ? "1.5rem" : data.content!.length > 200 ? "1.75rem" : "2.1rem",
                  fontWeight: 500,
                  lineHeight: 1.7,
                  margin: 0,
                  marginTop: idx > 0 ? "24px" : 0,
                }}
              >
                {renderHighlighted(paragraph)}
              </p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            paddingTop: "16px",
          }}
        >
          <span style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "0.7rem", letterSpacing: "3px", textTransform: "uppercase" }}>
            Powered by Buzzmaster
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
            <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>Live</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes highlightSlide {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
