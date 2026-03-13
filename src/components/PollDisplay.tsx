"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
} from "chart.js";
import type { PollData } from "@/lib/realtime-client";

// Register only what we need
Chart.register(CategoryScale, LinearScale, BarElement, BarController);

interface PollDisplayProps {
  poll: PollData | null;
  onClose?: () => void;
  onFillData?: () => void;
  onAnalyze?: () => void;
}

// Buzzmaster color palette — solid colors for Chart.js
const BAR_COLORS_SOLID = [
  { bg: "#1e7d91", glow: "rgba(25, 89, 105, 0.5)" },
  { bg: "#f30349", glow: "rgba(243, 3, 73, 0.5)" },
  { bg: "#9333ea", glow: "rgba(147, 51, 234, 0.5)" },
  { bg: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)" },
  { bg: "#10b981", glow: "rgba(16, 185, 129, 0.5)" },
];

// Gradient factory — builds a vertical gradient per bar
function createGradients(ctx: CanvasRenderingContext2D, chartArea: { bottom: number; top: number }) {
  return [
    ["#195969", "#1e7d91"],
    ["#f30349", "#ff3366"],
    ["#9333ea", "#a855f7"],
    ["#f59e0b", "#fbbf24"],
    ["#10b981", "#34d399"],
  ].map(([from, to]) => {
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    return g;
  });
}

// Plugin: draw percentage labels above bars
const percentageLabelPlugin = {
  id: "percentageLabels",
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data) return;

    ctx.save();
    ctx.font = "800 2.8rem sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    meta.data.forEach((bar, i) => {
      const value = chart.data.datasets[0].data[i] as number;
      if (value == null) return;
      const x = bar.x;
      const y = bar.y - 14;
      ctx.fillText(`${Math.round(value)}%`, x, y);
    });

    ctx.restore();
  },
};

// Plugin: apply gradients + glow shadows to bars
const gradientPlugin = {
  id: "gradientBars",
  beforeDatasetsDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const gradients = createGradients(ctx, chartArea);
    const ds = chart.data.datasets[0];
    const count = ds.data.length;

    ds.backgroundColor = Array.from({ length: count }, (_, i) => gradients[i % gradients.length]);

    // Apply glow via shadow on the bar elements
    const meta = chart.getDatasetMeta(0);
    if (meta?.data) {
      meta.data.forEach((bar, i) => {
        const el = bar as unknown as { draw: (ctx: CanvasRenderingContext2D) => void };
        const originalDraw = el.draw.bind(bar);
        el.draw = function (drawCtx: CanvasRenderingContext2D) {
          const color = BAR_COLORS_SOLID[i % BAR_COLORS_SOLID.length];
          drawCtx.save();
          drawCtx.shadowColor = color.glow;
          drawCtx.shadowBlur = 25;
          originalDraw(drawCtx);
          drawCtx.restore();
        };
      });
    }
  },
};

// Split long labels into multiple lines
function splitLabel(label: string, maxChars = 16): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function PollDisplay({ poll, onClose, onFillData, onAnalyze }: PollDisplayProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [animationKey, setAnimationKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const voteCountRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const lastPollId = useRef<string | null>(null);

  const hasResults = poll?.results && poll.results.length > 0;
  const totalVotes = poll?.results?.reduce((a, b) => a + b.votes, 0) || 0;

  // Create a unique ID that includes whether results exist
  const pollId = poll ? `${poll.question}-${(poll.options || []).join("-")}-${hasResults ? "results" : "options"}` : null;

  // Reset when poll changes OR when results first appear
  useEffect(() => {
    if (poll && pollId !== lastPollId.current) {
      lastPollId.current = pollId;
      setShowAnalysis(false);
      setAnalysisText("");
      hasAnimatedRef.current = false;
      setAnimationKey((k) => k + 1);
    }
  }, [poll, pollId, hasResults]);

  // Destroy chart on unmount or when poll goes away
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Single function: create or update chart
  useEffect(() => {
    if (!hasResults || !poll?.results) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const results = poll.results;
    const labels = results.map(r => splitLabel(r.option));
    const data = results.map(r => r.percentage);
    const maxVal = Math.max(...data, 10);

    if (chartRef.current) {
      // Live update — shorter animation
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = data;
      (chartRef.current.options.scales!.y as { max: number }).max = Math.min(maxVal + 15, 100);
      chartRef.current.update("active");
      return;
    }

    // First render: create chart — Chart.js animates bars from 0 automatically
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: BAR_COLORS_SOLID.slice(0, data.length).map(c => c.bg),
          borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          barPercentage: 0.65,
          categoryPercentage: 0.8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200, easing: "easeOutCubic" },
        transitions: {
          active: { animation: { duration: 800, easing: "easeOutCubic" } },
        },
        layout: { padding: { top: 60, bottom: 0, left: 0, right: 0 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: "white",
              font: { size: 20, weight: "bold" as const },
              maxRotation: 0,
              minRotation: 0,
              padding: 16,
            },
          },
          y: { display: false, beginAtZero: true, max: Math.min(maxVal + 15, 100) },
        },
      },
      plugins: [percentageLabelPlugin, gradientPlugin],
    });
  }, [hasResults, poll?.results]);

  // Update vote counter on every results change
  useEffect(() => {
    if (hasResults && voteCountRef.current) {
      voteCountRef.current.textContent = `${totalVotes.toLocaleString("nl-NL")} stemmen`;
    }
  }, [hasResults, totalVotes]);

  // Animate container — only on new poll, not on live result updates
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
  }, [animationKey]);

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
          // Destroy chart on close
          if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
          }
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
      className="fixed inset-0 z-50"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0a0a14 0%, #000000 100%)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "48px 80px",
          opacity: 0,
          overflowY: "auto",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
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

        <div style={{ margin: "auto 0" }}>
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
              {totalVotes.toLocaleString("nl-NL")} stemmen
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

        {/* CHART.JS BAR CHART or OPTIONS */}
        {hasResults ? (
          <div
            style={{
              height: "550px",
              padding: "0 40px",
              position: "relative",
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        ) : (
          /* OPTIONS with GSAP staggered animation */
          <div
            ref={optionsRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {(poll.options || []).map((option, index) => (
              <div
                key={index}
                className="poll-option"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "28px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "2px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "28px 36px",
                  opacity: 0,
                }}
              >
                {/* Letter badge with RED glow */}
                <span
                  style={{
                    width: "64px",
                    height: "64px",
                    background: "#f30349",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
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
                    fontSize: "2rem",
                    fontWeight: 600,
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
        >
          <span
            style={{
              color: "rgba(255, 255, 255, 0.2)",
              fontSize: "0.7rem",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
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
