"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { OpenVraagDeepDive } from "@/lib/realtime-client";

interface OpenVraagDeepDiveDisplayProps {
  data: OpenVraagDeepDive | null;
  question: string;
  onClose: () => void;
}

const REGION_COLORS: Record<string, string> = {
  "Randstad": "#f30349",
  "Noord": "#195969",
  "Zuid": "#9333ea",
  "Oost": "#f59e0b",
};

const PROFILE_ICONS: Record<string, string> = {
  "Management": "M",
  "HR & Talent": "HR",
  "IT & Tech": "IT",
  "Marketing & Sales": "MS",
};

export function OpenVraagDeepDiveDisplay({ data, question, onClose }: OpenVraagDeepDiveDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleSections, setVisibleSections] = useState(0);

  useEffect(() => {
    if (data && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );

      // Stagger sections appearing
      setVisibleSections(0);
      let count = 0;
      const total = data.byRegion.length + data.byProfile.length;
      const interval = setInterval(() => {
        count++;
        setVisibleSections(count);
        if (count >= total) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
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
          border: "3px solid rgba(243, 3, 73, 0.4)",
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
          x
        </button>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
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
              marginBottom: "18px",
            }}
          >
            DEEP DIVE - OPEN VRAAG
          </span>
          <h2 style={{ color: "white", fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.3 }}>
            {question}
          </h2>
        </div>

        {/* PER REGIO */}
        <div style={{ marginBottom: "36px" }}>
          <h3 style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "1.1rem",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}>
            Per Regio
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "28px" }}>
            {data.byRegion.map((region, idx) => {
              if (idx >= visibleSections) return null;
              const color = REGION_COLORS[region.region] || "#f30349";
              return (
                <div
                  key={region.region}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${color}44`,
                    borderRadius: "16px",
                    padding: "36px 40px",
                    animation: "fadeSlideIn 0.4s ease-out both",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                    <div style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 16px ${color}`,
                    }} />
                    <span style={{ color, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "1px" }}>
                      {region.region}
                    </span>
                  </div>

                  {/* Top answers */}
                  {region.topAnswers.map((answer, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                    }}>
                      <span style={{
                        color: i === 0 ? color : "rgba(255, 255, 255, 0.6)",
                        fontSize: i === 0 ? "1.5rem" : "1.3rem",
                        fontWeight: i === 0 ? 700 : 500,
                        flex: 1,
                      }}>
                        {i === 0 ? `"${answer.text}"` : answer.text}
                      </span>
                      <span style={{
                        color: i === 0 ? color : "rgba(255, 255, 255, 0.35)",
                        fontSize: "1.2rem",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {answer.count}x
                      </span>
                    </div>
                  ))}

                  {/* Insight line */}
                  <div style={{
                    marginTop: "14px",
                    paddingTop: "14px",
                    borderTop: `1px solid ${color}22`,
                    color: "rgba(255, 255, 255, 0.45)",
                    fontSize: "1.15rem",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                  }}>
                    {region.insight.split('"').length > 2
                      ? region.insight.replace(/"([^"]+)"/, "").trim().split(". ").slice(-1)[0]
                      : region.insight.split(". ").slice(-1)[0]
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PER PROFIEL */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "1.1rem",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}>
            Per Klantprofiel
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "28px" }}>
            {data.byProfile.map((profile, idx) => {
              const sectionIdx = data.byRegion.length + idx;
              if (sectionIdx >= visibleSections) return null;
              const icon = PROFILE_ICONS[profile.profile] || "?";
              return (
                <div
                  key={profile.profile}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    padding: "36px 40px",
                    animation: "fadeSlideIn 0.4s ease-out both",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "rgba(243, 3, 73, 0.15)",
                      border: "1px solid rgba(243, 3, 73, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      fontWeight: 800,
                      color: "#f30349",
                    }}>
                      {icon}
                    </div>
                    <span style={{
                      color: "rgba(255, 255, 255, 0.85)",
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      letterSpacing: "1px",
                    }}>
                      {profile.profile}
                    </span>
                  </div>

                  {/* Top answer highlighted */}
                  <div style={{
                    background: "rgba(243, 3, 73, 0.08)",
                    border: "1px solid rgba(243, 3, 73, 0.2)",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginBottom: "12px",
                  }}>
                    <span style={{
                      color: "#f30349",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                    }}>
                      &quot;{profile.topAnswers[0].text}&quot;
                    </span>
                    <span style={{
                      marginLeft: "10px",
                      color: "rgba(243, 3, 73, 0.6)",
                      fontSize: "1.2rem",
                      fontWeight: 600,
                    }}>
                      {profile.topAnswers[0].count}x
                    </span>
                  </div>

                  {/* Other answers */}
                  {profile.topAnswers.slice(1).map((answer, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                      paddingLeft: "4px",
                    }}>
                      <span style={{
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: "1.3rem",
                      }}>
                        {answer.text}
                      </span>
                      <span style={{
                        color: "rgba(255, 255, 255, 0.3)",
                        fontSize: "1.15rem",
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {answer.count}x
                      </span>
                    </div>
                  ))}

                  {/* Insight */}
                  <div style={{
                    marginTop: "14px",
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    color: "rgba(255, 255, 255, 0.45)",
                    fontSize: "1.15rem",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                  }}>
                    {profile.insight.split('"').length > 2
                      ? profile.insight.replace(/"([^"]+)"/, "").trim().split(". ").slice(-1)[0]
                      : profile.insight.split(". ").slice(-1)[0]
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "16px",
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
      `}</style>
    </div>
  );
}
