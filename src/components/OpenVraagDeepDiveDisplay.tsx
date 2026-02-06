"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { OpenVraagDeepDive } from "@/lib/realtime-client";

interface OpenVraagDeepDiveDisplayProps {
  data: OpenVraagDeepDive | null;
  question: string;
  onClose: () => void;
}

// Highlight percentages, quoted text, region names, and profile names in red
function highlightInsight(text: string): string {
  // Quoted text FIRST (before HTML with quotes gets injected)
  let result = text.replace(/"([^"]+)"/g, '<span style="color: white; font-weight: 700;">"$1"</span>');
  // Percentages
  result = result.replace(/(\d+%)/g, '<span style="color: white; font-weight: 700;">$1</span>');
  // Count references like "25x"
  result = result.replace(/(\d+x)/g, '<span style="color: white; font-weight: 700;">$1</span>');
  // Highlight region names
  const regions = ["Randstad", "Noord", "Zuid", "Oost"];
  regions.forEach(r => {
    result = result.replace(new RegExp(`\\b${r}\\b`, "g"), `<span style="color: white; font-weight: 700;">${r}</span>`);
  });
  // Highlight profile names
  const profiles = ["Management", "HR & Talent", "IT & Tech", "Marketing & Sales"];
  profiles.forEach(p => {
    result = result.replace(new RegExp(p.replace(/[&]/g, '&amp;'), "g"), `<span style="color: white; font-weight: 700;">${p}</span>`);
  });
  return result;
}

const CARD_COLORS = ["#f30349", "#3b82f6", "#a78bfa", "#f59e0b"];

export function OpenVraagDeepDiveDisplay({ data, question, onClose }: OpenVraagDeepDiveDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (data && containerRef.current) {
      setIsReady(false);
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );

      const timer = setTimeout(() => setIsReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "rgba(5, 5, 5, 0.95)",
        backdropFilter: "blur(20px)",
        padding: "24px",
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full mx-auto"
        style={{
          background: "linear-gradient(145deg, #0d0d0d, #050505)",
          borderRadius: "16px",
          padding: "48px 56px",
          margin: "auto",
          boxShadow: "0 50px 100px rgba(0, 0, 0, 0.8), 0 0 150px rgba(243, 3, 73, 0.1)",
          opacity: 0,
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - altijd zichtbaar */}
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

        {!isReady ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "300px",
            gap: "24px",
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              border: "3px solid rgba(243, 3, 73, 0.15)",
              borderTopColor: "#f30349",
              animation: "deepDiveSpin 0.8s linear infinite",
              boxShadow: "0 0 30px rgba(243, 3, 73, 0.2)",
            }} />
            <span style={{
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "6px",
              textTransform: "uppercase",
            }}>
              ANALYSEREN...
            </span>
          </div>
        ) : (
          <div style={{ animation: "deepDiveFadeIn 0.4s ease-out" }}>
            {/* Header (badge + vraag) */}
            <div style={{ marginBottom: "8px" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #f30349, #195969)",
                  color: "white",
                  padding: "10px 28px",
                  borderRadius: "9999px",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  letterSpacing: "3px",
                  display: "inline-block",
                  marginBottom: "12px",
                }}
              >
                DEEP DIVE - OPEN VRAAG
              </span>
              <h2 style={{ color: "white", fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.3 }}>
                {question}
              </h2>
            </div>

            {/* Overall insight - hero citaat */}
            <p
              style={{
                color: "white",
                fontSize: "1.6rem",
                fontWeight: 400,
                lineHeight: 1.5,
                marginBottom: "28px",
                opacity: 0.85,
                borderLeft: "4px solid #195969",
                paddingLeft: "20px",
              }}
              dangerouslySetInnerHTML={{
                __html: highlightInsight(data.overallInsight),
              }}
            />

            {/* 2x2 Key cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              {data.keyCards.slice(0, 4).map((card, idx) => {
                const cardColor = CARD_COLORS[idx % CARD_COLORS.length];
                return (
                <div
                  key={card.title}
                  style={{
                    background: `${cardColor}11`,
                    borderRadius: "16px",
                    padding: "22px 26px",
                    borderLeft: `4px solid ${cardColor}`,
                  }}
                >
                  <div style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: cardColor,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    marginBottom: "10px",
                  }}>
                    {card.title}
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {card.bullets.map((bullet, i) => (
                      <li key={i} style={{
                        color: "rgba(255, 255, 255, 0.85)",
                        fontSize: "1.2rem",
                        lineHeight: 1.4,
                        paddingLeft: "20px",
                        position: "relative",
                      }}>
                        <span style={{ position: "absolute", left: 0, color: cardColor }}>•</span>
                        <span dangerouslySetInnerHTML={{ __html: highlightInsight(bullet) }} />
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                paddingTop: "16px",
              }}
            >
              <span style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "0.7rem", letterSpacing: "3px", textTransform: "uppercase" }}>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>Live</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes deepDiveSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes deepDiveFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
