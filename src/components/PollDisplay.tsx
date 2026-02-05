"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import type { PollData } from "@/lib/realtime-client";

interface PollDisplayProps {
  poll: PollData | null;
  onClose?: () => void;
  onFillData?: () => void;
  onAnalyze?: () => void;
}

// Buzzmaster color palette
const BAR_COLORS = [
  { bg: "linear-gradient(to top, #195969, #1e7d91)", glow: "rgba(25, 89, 105, 0.5)" },
  { bg: "linear-gradient(to top, #f30349, #ff3366)", glow: "rgba(243, 3, 73, 0.5)" },
  { bg: "linear-gradient(to top, #9333ea, #a855f7)", glow: "rgba(147, 51, 234, 0.5)" },
  { bg: "linear-gradient(to top, #f59e0b, #fbbf24)", glow: "rgba(245, 158, 11, 0.5)" },
  { bg: "linear-gradient(to top, #10b981, #34d399)", glow: "rgba(16, 185, 129, 0.5)" },
];

export function PollDisplay({ poll, onClose, onFillData, onAnalyze }: PollDisplayProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [animationKey, setAnimationKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const voteCountRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const lastPollId = useRef<string | null>(null);

  const hasResults = poll?.results && poll.results.length > 0;
  const totalVotes = poll?.results?.reduce((a, b) => a + b.votes, 0) || 0;

  // Create a unique ID that includes whether results exist
  const pollId = poll ? `${poll.question}-${poll.options.join("-")}-${hasResults ? "results" : "options"}` : null;

  // Reset when poll changes OR when results appear
  useEffect(() => {
    if (poll && pollId !== lastPollId.current) {
      lastPollId.current = pollId;
      setShowAnalysis(false);
      setAnalysisText("");
      hasAnimatedRef.current = false;
      setAnimationKey((k) => k + 1);
    }
  }, [poll, pollId, hasResults]);

  // Animate container after it's rendered
  useLayoutEffect(() => {
    if (poll && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95, y: 40 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
        }
      );
    }
  }, [poll, animationKey]);

  // Animate options with GSAP - only once per animationKey
  useLayoutEffect(() => {
    if (poll && !hasResults && optionsRef.current && !hasAnimatedRef.current) {
      const options = optionsRef.current.querySelectorAll(".poll-option");

      if (options.length > 0) {
        hasAnimatedRef.current = true;

        gsap.set(options, {
          opacity: 0,
          x: 80,
          scale: 0.85,
        });

        gsap.to(options, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "back.out(1.7)",
          delay: 0.4,
        });
      }
    }
  }, [poll, hasResults, animationKey]);

  // Animate bars with GSAP - only once when results appear
  useLayoutEffect(() => {
    if (hasResults && barsRef.current && poll?.results && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;

      const bars = barsRef.current.querySelectorAll(".bar-fill");
      const percents = barsRef.current.querySelectorAll(".bar-percent");

      // Kill any existing animations
      gsap.killTweensOf(bars);
      gsap.killTweensOf(percents);

      // Reset bars
      gsap.set(bars, { height: "0%" });

      // Animate each bar with elastic bounce
      poll.results.forEach((result, i) => {
        const maxPercent = Math.max(...poll.results!.map((r) => r.percentage));
        const normalizedHeight = (result.percentage / maxPercent) * 100;

        gsap.to(bars[i], {
          height: `${normalizedHeight}%`,
          duration: 1.4,
          delay: 0.4 + i * 0.12,
          ease: "elastic.out(1, 0.4)",
        });

        // Animate percentage counter
        const counter = { val: 0 };
        gsap.to(counter, {
          val: result.percentage,
          duration: 1.5,
          delay: 0.4 + i * 0.12,
          ease: "power2.out",
          onUpdate: () => {
            if (percents[i]) {
              (percents[i] as HTMLElement).textContent = `${Math.round(counter.val)}%`;
            }
          },
        });
      });

      // Animate vote counter
      if (voteCountRef.current) {
        const voteCounter = { val: 0 };
        gsap.to(voteCounter, {
          val: totalVotes,
          duration: 2,
          delay: 0.3,
          ease: "power2.out",
          onUpdate: () => {
            if (voteCountRef.current) {
              voteCountRef.current.textContent = `${Math.round(voteCounter.val).toLocaleString("nl-NL")} stemmen`;
            }
          },
        });
      }
    }
  }, [hasResults, animationKey]);

  // Handle analysis
  const handleAnalyze = () => {
    if (onAnalyze) onAnalyze();

    setShowAnalysis(true);

    const fullText =
      "35% gebruikt AI dagelijks - dat is een sterke adoptie! Maar 19% zelden of nooit... daar ligt kans voor educatie en onboarding.";

    let i = 0;
    setAnalysisText("");

    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setAnalysisText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 25);

    setTimeout(() => {
      if (analysisRef.current) {
        gsap.fromTo(
          analysisRef.current,
          { opacity: 0, scale: 0.9, y: 30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }
        );
      }
    }, 50);
  };

  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        y: 20,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setShowAnalysis(false);
          hasAnimatedRef.current = false;
          lastPollId.current = null;
          onClose?.();
        },
      });
    } else {
      onClose?.();
    }
  };

  if (!poll) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "rgba(5, 5, 5, 0.92)",
        backdropFilter: "blur(20px)",
      }}
      onClick={handleClose}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-7xl mx-8"
        style={{
          background: "linear-gradient(145deg, #0d0d0d, #050505)",
          borderRadius: "16px",
          border: "3px solid rgba(25, 89, 105, 0.4)",
          padding: "64px 72px",
          boxShadow: `
            0 50px 100px rgba(0, 0, 0, 0.8),
            0 0 150px rgba(25, 89, 105, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.03)
          `,
          opacity: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
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
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.2)")}
        >
          ×
        </button>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <span
            style={{
              background: "#f30349",
              color: "white",
              padding: "10px 28px",
              borderRadius: "9999px",
              fontSize: "0.9rem",
              fontWeight: 700,
              letterSpacing: "3px",
              boxShadow: "0 0 35px rgba(243, 3, 73, 0.6)",
            }}
          >
            LIVE POLL
          </span>
          {hasResults && (
            <span
              ref={voteCountRef}
              style={{
                color: "#195969",
                fontSize: "1.8rem",
                fontWeight: 700,
              }}
            >
              0 stemmen
            </span>
          )}
        </div>

        {/* Question */}
        <h2
          style={{
            color: "white",
            fontSize: "3rem",
            fontWeight: 700,
            marginBottom: "48px",
            lineHeight: 1.25,
            textAlign: "center",
          }}
        >
          {poll.question}
        </h2>

        {/* VERTICAL BAR CHART */}
        {hasResults ? (
          <div
            ref={barsRef}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: "48px",
              height: "520px",
              padding: "0 20px",
            }}
          >
            {poll.results?.map((result, index) => {
              const color = BAR_COLORS[index % BAR_COLORS.length];

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "140px",
                  }}
                >
                  {/* Percentage */}
                  <span
                    className="bar-percent"
                    style={{
                      color: "white",
                      fontSize: "2.2rem",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      marginBottom: "16px",
                      height: "40px",
                    }}
                  >
                    0%
                  </span>

                  {/* Bar container */}
                  <div
                    style={{
                      width: "110px",
                      height: "400px",
                      background: "rgba(255, 255, 255, 0.06)",
                      borderRadius: "12px 12px 0 0",
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-end",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="bar-fill"
                      style={{
                        width: "100%",
                        height: "0%",
                        background: color.bg,
                        borderRadius: "12px 12px 0 0",
                        boxShadow: `0 0 25px ${color.glow}`,
                      }}
                    />
                  </div>

                  {/* Label - WHITE and aligned */}
                  <span
                    style={{
                      color: "white",
                      fontSize: "1.2rem",
                      fontWeight: 500,
                      textAlign: "center",
                      marginTop: "24px",
                      marginBottom: "16px",
                      minHeight: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {result.option}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* OPTIONS with GSAP staggered animation */
          <div
            ref={optionsRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            {poll.options.map((option, index) => (
              <div
                key={index}
                className="poll-option"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "2px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "20px 28px",
                  opacity: 0,
                }}
              >
                {/* Letter badge with RED glow */}
                <span
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "#f30349",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "white",
                    flexShrink: 0,
                    boxShadow: "0 0 25px rgba(243, 3, 73, 0.6)",
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </span>

                {/* Option text */}
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: "1.25rem",
                    fontWeight: 500,
                  }}
                >
                  {option}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Analysis overlay */}
        {showAnalysis && (
          <div
            ref={analysisRef}
            style={{
              position: "absolute",
              bottom: "100px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "90%",
              maxWidth: "800px",
              background: "rgba(243, 3, 73, 0.15)",
              border: "2px solid #f30349",
              borderRadius: "16px",
              padding: "28px 36px",
              boxShadow: "0 0 50px rgba(243, 3, 73, 0.4)",
              opacity: 0,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  background: "#f30349",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  color: "white",
                  flexShrink: 0,
                  boxShadow: "0 0 30px rgba(243, 3, 73, 0.7)",
                }}
              >
                N
              </div>

              <div>
                <span
                  style={{
                    color: "#f30349",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                    textShadow: "0 0 20px rgba(243, 3, 73, 0.8)",
                  }}
                >
                  NOVA INSIGHT
                </span>
                <p
                  style={{
                    color: "white",
                    fontSize: "1.3rem",
                    fontWeight: 500,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {analysisText}
                  <span
                    style={{
                      color: "#f30349",
                      animation: "blink 0.8s infinite",
                    }}
                  >
                    |
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="mt-10 pt-6 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
        >
          <span
            style={{
              color: "rgba(255, 255, 255, 0.2)",
              fontSize: "0.7rem",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            Powered by Buzzmaster
          </span>

          <div className="flex items-center gap-4">
            {!hasResults && onFillData && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFillData();
                }}
                style={{
                  background: "#195969",
                  color: "white",
                  padding: "14px 32px",
                  borderRadius: "9999px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 30px rgba(25, 89, 105, 0.5)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow = "0 0 50px rgba(25, 89, 105, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(25, 89, 105, 0.5)";
                }}
              >
                Stemmen Laden
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
