"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export interface SeatAllocationData {
  question: string;
  totalSeats: number;
  results: { option: string; percentage: number; seats: number }[];
}

interface SeatAllocationDisplayProps {
  data: SeatAllocationData | null;
  onClose: () => void;
}

// Colors matching the poll bar colors
const SEAT_COLORS = [
  "#195969",
  "#f30349",
  "#9333ea",
  "#f59e0b",
  "#10b981",
];

const SEAT_GLOW = [
  "rgba(25, 89, 105, 0.6)",
  "rgba(243, 3, 73, 0.6)",
  "rgba(147, 51, 234, 0.6)",
  "rgba(245, 158, 11, 0.6)",
  "rgba(16, 185, 129, 0.6)",
];

// Generate seat positions in a hemicycle (half circle) layout
function generateSeatPositions(totalSeats: number): { x: number; y: number; row: number }[] {
  const seats: { x: number; y: number; row: number }[] = [];
  // Rows from inner to outer
  const rows = totalSeats <= 100 ? 5 : totalSeats <= 150 ? 7 : 9;
  const centerX = 400;
  const centerY = 380;
  const minRadius = 120;
  const maxRadius = 340;

  // Distribute seats across rows
  let seatsPlaced = 0;
  for (let row = 0; row < rows; row++) {
    if (seatsPlaced >= totalSeats) break;
    const radius = minRadius + (maxRadius - minRadius) * (row / (rows - 1));
    // More seats in outer rows
    const seatsInRow = Math.min(
      Math.round((totalSeats / rows) * (0.7 + 0.6 * (row / (rows - 1)))),
      totalSeats - seatsPlaced
    );

    for (let i = 0; i < seatsInRow; i++) {
      if (seatsPlaced >= totalSeats) break;
      // Angle from left to right (PI to 0), with padding
      const padding = 0.08;
      const angle = Math.PI * (1 - padding) - (Math.PI * (1 - 2 * padding)) * (i / (seatsInRow - 1 || 1));
      seats.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY - radius * Math.sin(angle),
        row,
      });
      seatsPlaced++;
    }
  }

  return seats;
}

// Assign colors to seats based on results (proportional)
function assignSeatColors(
  seats: { x: number; y: number; row: number }[],
  results: { option: string; seats: number }[]
): string[] {
  const colors: string[] = [];
  // Sort seats left-to-right by angle for nice visual grouping
  const sortedIndices = seats
    .map((s, i) => ({ ...s, idx: i }))
    .sort((a, b) => {
      // Sort by angle (left to right)
      const angleA = Math.atan2(380 - a.y, a.x - 400);
      const angleB = Math.atan2(380 - b.y, b.x - 400);
      return angleB - angleA; // PI to 0 = left to right
    });

  let seatIdx = 0;
  results.forEach((result, optIdx) => {
    for (let i = 0; i < result.seats; i++) {
      if (seatIdx < sortedIndices.length) {
        const realIdx = sortedIndices[seatIdx].idx;
        colors[realIdx] = SEAT_COLORS[optIdx % SEAT_COLORS.length];
        seatIdx++;
      }
    }
  });

  // Fill remaining with gray
  while (seatIdx < sortedIndices.length) {
    const realIdx = sortedIndices[seatIdx].idx;
    colors[realIdx] = "rgba(255,255,255,0.1)";
    seatIdx++;
  }

  return colors;
}

export function SeatAllocationDisplay({ data, onClose }: SeatAllocationDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleSeats, setVisibleSeats] = useState(0);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.95, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
    );

    // Animate seats appearing
    setVisibleSeats(0);
    let count = 0;
    const total = data.totalSeats;
    const interval = setInterval(() => {
      count += 4; // 4 seats at a time
      setVisibleSeats(Math.min(count, total));
      if (count >= total) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [data]);

  if (!data) return null;

  const seats = generateSeatPositions(data.totalSeats);
  const seatColors = assignSeatColors(seats, data.results);

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
        className="relative w-full max-w-5xl mx-auto"
        style={{
          background: "linear-gradient(145deg, #0d0d0d, #050505)",
          borderRadius: "20px",
          border: "3px solid rgba(243, 3, 73, 0.4)",
          padding: "44px 52px",
          boxShadow: "0 50px 100px rgba(0, 0, 0, 0.8), 0 0 150px rgba(243, 3, 73, 0.1)",
          opacity: 0,
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
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <span
            style={{
              background: "linear-gradient(135deg, #195969, #f30349)",
              color: "white",
              padding: "10px 28px",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "3px",
              display: "inline-block",
              marginBottom: "14px",
            }}
          >
            ZETELVERDELING
          </span>
          <h2 style={{ color: "white", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.3 }}>
            {data.question}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", marginTop: "6px" }}>
            {data.totalSeats} zetels
          </p>
        </div>

        {/* Hemicycle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <svg viewBox="60 20 680 380" width="100%" style={{ maxWidth: "700px", maxHeight: "380px" }}>
            {seats.map((seat, idx) => {
              if (idx >= visibleSeats) return null;
              const color = seatColors[idx] || "rgba(255,255,255,0.1)";
              const colorIdx = SEAT_COLORS.indexOf(color);
              const glow = colorIdx >= 0 ? SEAT_GLOW[colorIdx] : "none";

              return (
                <circle
                  key={idx}
                  cx={seat.x}
                  cy={seat.y}
                  r={seats.length > 120 ? 7 : seats.length > 80 ? 8.5 : 10}
                  fill={color}
                  style={{
                    filter: glow !== "none" ? `drop-shadow(0 0 4px ${glow})` : undefined,
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend + seats per option */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "28px",
          flexWrap: "wrap",
        }}>
          {data.results.map((result, idx) => (
            <div key={result.option} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "16px",
                height: "16px",
                borderRadius: "4px",
                background: SEAT_COLORS[idx % SEAT_COLORS.length],
                boxShadow: `0 0 8px ${SEAT_GLOW[idx % SEAT_GLOW.length]}`,
              }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.05rem", fontWeight: 600 }}>
                {result.option}
              </span>
              <span style={{
                color: SEAT_COLORS[idx % SEAT_COLORS.length],
                fontSize: "1.2rem",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}>
                {result.seats}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "20px",
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
