"use client";

import { useState, useEffect, useMemo } from "react";
import type { OpenAnswer } from "@/lib/realtime-client";

interface OpenVraagData {
  question: string;
  words?: OpenAnswer[];
  showResults?: boolean;
}

interface OpenVraagDisplayProps {
  openVraag: OpenVraagData | null;
  onClose: () => void;
}

// Distribute answers across 3 columns for masonry effect
function getMasonryColumns(items: OpenAnswer[], columnCount: number): OpenAnswer[][] {
  const columns: OpenAnswer[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => {
    columns[i % columnCount].push(item);
  });
  return columns;
}

// Vary font size based on text length for masonry feel
function getTileSize(text: string): { fontSize: string; padding: string } {
  const len = text.length;
  if (len < 20) return { fontSize: "2.1rem", padding: "40px 38px 32px" };
  if (len < 50) return { fontSize: "1.8rem", padding: "36px 34px 28px" };
  if (len < 100) return { fontSize: "1.55rem", padding: "32px 30px 26px" };
  return { fontSize: "1.35rem", padding: "28px 28px 24px" };
}

export function OpenVraagDisplay({ openVraag, onClose }: OpenVraagDisplayProps) {
  const [showCards, setShowCards] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const words = useMemo(() => {
    if (!openVraag?.words) return [];
    return openVraag.words;
  }, [openVraag?.words]);

  // When results come in: show ALL cards at once (no stagger)
  useEffect(() => {
    if (!openVraag?.showResults || words.length === 0) return;
    setShowCards(false);
    // Small delay then pop them all
    const timer = setTimeout(() => setShowCards(true), 150);
    return () => clearTimeout(timer);
  }, [openVraag?.showResults, words.length]);

  useEffect(() => {
    if (openVraag) {
      setShowCards(false);
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
      setShowCards(false);
    }
  }, [openVraag?.question]);

  if (!openVraag) return null;

  const showResults = openVraag.showResults === true;
  const columns = getMasonryColumns(words, 3);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0a0a14 0%, #000000 100%)",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.4s ease-out",
        pointerEvents: isVisible ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "24px",
          right: "32px",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          background: "rgba(0, 0, 0, 0.5)",
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: "22px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          zIndex: 100,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(243, 3, 73, 0.5)";
          e.currentTarget.style.color = "#f30349";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
        }}
      >
        x
      </button>

      {/* Question only (no results yet) */}
      {!showResults && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 24px",
              borderRadius: "40px",
              background: "rgba(243, 3, 73, 0.1)",
              border: "1px solid rgba(243, 3, 73, 0.3)",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#f30349",
                boxShadow: "0 0 20px #f30349",
                animation: "glow 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f30349",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              Open Vraag
            </span>
          </div>
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              maxWidth: "900px",
              lineHeight: 1.2,
            }}
          >
            {openVraag.question}
          </h1>
          <div
            style={{
              marginTop: "48px",
              display: "flex",
              gap: "12px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: "#f30349",
                  boxShadow: "0 0 15px #f30349",
                  animation: "pulse 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <p
            style={{
              marginTop: "32px",
              fontSize: "1rem",
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            Wachten op antwoorden...
          </p>
        </div>
      )}

      {/* Results: Masonry tiles - BIG, centered, popping */}
      {showResults && (
        <>
          {/* Header */}
          <div
            style={{
              position: "absolute",
              top: "28px",
              left: 0,
              right: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "24px",
                background: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(243, 3, 73, 0.3)",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#f30349",
                  boxShadow: "0 0 10px #f30349",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#f30349",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Open Vraag
              </span>
            </div>
            <h2
              style={{
                fontSize: "2.2rem",
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: "900px",
                lineHeight: 1.2,
              }}
            >
              {openVraag.question}
            </h2>
          </div>

          {/* Masonry grid - 3 columns, big tiles, centered */}
          <div
            style={{
              position: "absolute",
              top: "200px",
              left: "0",
              right: "0",
              bottom: "80px",
              display: "flex",
              justifyContent: "center",
              padding: "0 60px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                maxWidth: "1400px",
                width: "100%",
              }}
            >
              {columns.map((column, colIdx) => (
                <div
                  key={colIdx}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {column.map((word, rowIdx) => {
                    const globalIdx = colIdx + rowIdx * columns.length;
                    const tileSize = getTileSize(word.text);

                    const dotColor = globalIdx % 2 === 0 ? "#f30349" : "#195969";

                    return (
                      <div
                        key={`${word.text}-${globalIdx}`}
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.10)",
                          borderRadius: "20px",
                          padding: tileSize.padding,
                          opacity: showCards ? 1 : 0,
                          transform: showCards ? "scale(1)" : "scale(0.7)",
                          transition: `all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${globalIdx * 0.04}s`,
                        }}
                      >
                        <p
                          style={{
                            color: "white",
                            fontSize: tileSize.fontSize,
                            fontWeight: 600,
                            lineHeight: 1.5,
                            margin: 0,
                            marginBottom: "18px",
                          }}
                        >
                          {word.text}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            paddingTop: "14px",
                          }}
                        >
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: dotColor,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              color: "rgba(255, 255, 255, 0.55)",
                              fontSize: "0.95rem",
                              fontWeight: 500,
                            }}
                          >
                            {word.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "40px",
              right: "40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 50,
            }}
          >
            <span
              style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.4)",
                background: "rgba(0, 0, 0, 0.5)",
                padding: "8px 18px",
                borderRadius: "20px",
              }}
            >
              {words.length} antwoorden
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0, 0, 0, 0.5)",
                padding: "8px 18px",
                borderRadius: "20px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 10px #22c55e",
                }}
              />
              <span
                style={{
                  fontSize: "14px",
                  color: "rgba(255, 255, 255, 0.6)",
                }}
              >
                Live
              </span>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
