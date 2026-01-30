"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { NovaImageData } from "@/lib/realtime-client";

interface NovaImageDisplayProps {
  data: NovaImageData | null;
  onClose: () => void;
}

export function NovaImageDisplay({ data, onClose }: NovaImageDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.9, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
    }
  }, [data]);

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
        className="relative"
        style={{
          opacity: 0,
          maxWidth: "85vw",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "-16px",
            right: "-16px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "2px solid rgba(243, 3, 73, 0.4)",
            background: "rgba(0, 0, 0, 0.9)",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f30349";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(243, 3, 73, 0.4)";
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
          }}
        >
          x
        </button>

        {/* Image with glow border */}
        <div
          style={{
            borderRadius: "20px",
            overflow: "hidden",
            border: "3px solid rgba(243, 3, 73, 0.4)",
            boxShadow: "0 0 80px rgba(243, 3, 73, 0.15), 0 30px 60px rgba(0, 0, 0, 0.7)",
          }}
        >
          <img
            src={data.imageUrl}
            alt="AI Generated"
            style={{
              display: "block",
              maxWidth: "80vw",
              maxHeight: "75vh",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Nova badge */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 24px",
            borderRadius: "9999px",
            background: "rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(243, 3, 73, 0.3)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "#f30349",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 900,
              color: "white",
            }}
          >
            N
          </div>
          <span
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Nova AI Image
          </span>
        </div>
      </div>
    </div>
  );
}
