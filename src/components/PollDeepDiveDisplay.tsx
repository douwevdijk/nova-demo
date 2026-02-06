"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { PollDeepDive } from "@/lib/realtime-client";

interface PollDeepDiveDisplayProps {
  data: PollDeepDive | null;
  question: string;
  mode: "regions" | "profiles";
  onClose: () => void;
}

// Region positions on Netherlands map (percentages of SVG viewBox)
const REGION_POSITIONS: Record<string, { x: number; y: number }> = {
  "Randstad": { x: 42, y: 40 },
  "Noord": { x: 65, y: 14 },
  "Zuid": { x: 55, y: 65 },
  "Oost": { x: 72, y: 42 },
};

const REGION_COLORS: Record<string, string> = {
  "Randstad": "#f30349",
  "Noord": "#195969",
  "Zuid": "#9333ea",
  "Oost": "#f59e0b",
};

export function PollDeepDiveDisplay({ data, question, mode, onClose }: PollDeepDiveDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRegions, setVisibleRegions] = useState(0);

  useEffect(() => {
    if (data && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );

      if (mode === "regions") {
        // Stagger regions appearing on map
        setVisibleRegions(0);
        let count = 0;
        const interval = setInterval(() => {
          count++;
          setVisibleRegions(count);
          if (count >= data.regions.length) clearInterval(interval);
        }, 400);
        return () => clearInterval(interval);
      }
    }
  }, [data, mode]);

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
          padding: "48px 64px",
          boxShadow: "0 50px 100px rgba(0, 0, 0, 0.8), 0 0 150px rgba(243, 3, 73, 0.1)",
          opacity: 0,
          maxHeight: "calc(100vh - 48px)",
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
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <span
            style={{
              background: mode === "regions"
                ? "linear-gradient(135deg, #f30349, #195969)"
                : "linear-gradient(135deg, #f30349, #9333ea)",
              color: "white",
              padding: "8px 24px",
              borderRadius: "9999px",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "3px",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            {mode === "regions" ? "ANALYSE PER REGIO" : "ANALYSE PER PROFIEL"}
          </span>
          <h2 style={{ color: "white", fontSize: "2.2rem", fontWeight: 700, lineHeight: 1.3 }}>
            {question}
          </h2>
        </div>

        {/* REGIONS MODE: Netherlands Map - full width, no stats sidebar */}
        {mode === "regions" && (
          <div>
            <div style={{ position: "relative", width: "100%", maxWidth: "560px", aspectRatio: "580 / 616", margin: "0 auto" }}>
              {/* Netherlands SVG - visible outlines */}
              <img
                src="/netherlands.svg"
                alt="Nederland"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  opacity: 1,
                  filter: "brightness(1.1) saturate(2.5)",
                }}
              />

              {/* Region dots + labels */}
              {data.regions.slice(0, visibleRegions).map((region, idx) => {
                const pos = REGION_POSITIONS[region.region] || { x: 50, y: 50 };
                const color = REGION_COLORS[region.region] || "#f30349";
                const winner = region.results[0];

                return (
                  <div
                    key={region.region}
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      animation: "regionPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
                    }}
                  >
                    {/* Pulse ring */}
                    <div
                      style={{
                        position: "absolute",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        border: `2px solid ${color}`,
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        animation: "regionPulse 2s ease-out infinite",
                        opacity: 0.4,
                      }}
                    />
                    {/* Dot */}
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: color,
                        boxShadow: `0 0 20px ${color}, 0 0 40px ${color}66`,
                      }}
                    />
                    {/* Label card */}
                    <div
                      style={{
                        position: "absolute",
                        top: "24px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0, 0, 0, 0.85)",
                        border: `1px solid ${color}66`,
                        borderRadius: "10px",
                        padding: "8px 14px",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px" }}>
                        {region.region}
                      </div>
                      <div style={{ color: "white", fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
                        {winner.option}: {winner.percentage}%
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginTop: "2px" }}>
                        {region.totalVotes} stemmen
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PROFILES MODE: Overall insight + bullet cards */}
        {mode === "profiles" && (
          <div>
            {/* Overall profile insight */}
            {data.overallProfileInsight && (
              <p
                style={{
                  color: "white",
                  fontSize: "2.2rem",
                  fontWeight: 400,
                  lineHeight: 1.6,
                  marginBottom: "40px",
                  opacity: 0.85,
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightInsight(data.overallProfileInsight),
                }}
              />
            )}

            {/* Profile cards with key insights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "28px" }}>
              {data.profiles.map((profile, idx) => (
                <div
                  key={profile.profile}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "16px",
                    padding: "36px 40px",
                    animation: `fadeSlideIn 0.4s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f30349", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "20px" }}>
                    {profile.profile}
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
                    {profile.keyInsights.map((insight, i) => (
                      <li
                        key={i}
                        style={{
                          color: "rgba(255, 255, 255, 0.85)",
                          fontSize: "1.8rem",
                          lineHeight: 1.5,
                          paddingLeft: "24px",
                          position: "relative",
                        }}
                      >
                        <span style={{ position: "absolute", left: 0, color: "rgba(255,255,255,0.3)" }}>•</span>
                        <span dangerouslySetInnerHTML={{ __html: highlightInsight(insight) }} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

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

      <style jsx global>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes regionPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          70% { transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes regionPulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Highlight percentages and key words in red
function highlightInsight(text: string): string {
  // Quoted text EERST (voordat er HTML met quotes wordt geïnjecteerd)
  let result = text.replace(/"([^"]+)"/g, '<span style="color: #f30349; font-weight: 700;">"$1"</span>');
  // Percentages
  result = result.replace(/(\d+%)/g, '<span style="color: #f30349; font-weight: 700;">$1</span>');
  // Highlight region names
  const regions = ["Randstad", "Noord", "Zuid", "Oost"];
  regions.forEach(r => {
    result = result.replace(new RegExp(`\\b${r}\\b`, "g"), `<span style="color: #f30349; font-weight: 700;">${r}</span>`);
  });
  // Highlight profile names
  const profiles = ["Management", "HR & Talent", "IT & Tech", "Marketing & Sales"];
  profiles.forEach(p => {
    result = result.replace(new RegExp(p.replace(/[&]/g, '&amp;'), "g"), `<span style="color: #f30349; font-weight: 700;">${p}</span>`);
  });
  return result;
}
