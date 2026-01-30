"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface WebSearchOverlayProps {
  isVisible: boolean;
  query: string;
  result: string | null;
  onClose?: () => void;
}

export function WebSearchOverlay({ isVisible, query, result, onClose }: WebSearchOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayedResult, setDisplayedResult] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(true);

  // Animate in
  useEffect(() => {
    if (isVisible && containerRef.current) {
      setIsSearching(true);

      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" }
      );

      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 40, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.1, ease: "back.out(1.4)" }
        );
      }
    }
  }, [isVisible]);

  // Type out result when it arrives
  useEffect(() => {
    if (result && isVisible) {
      setIsSearching(false);
      setIsTyping(true);
      setDisplayedResult("");

      let i = 0;
      const typeInterval = setInterval(() => {
        if (i < result.length) {
          setDisplayedResult(result.slice(0, i + 1));
          i++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 20);

      return () => clearInterval(typeInterval);
    }
  }, [result, isVisible]);

  // Reset when hidden
  useEffect(() => {
    if (!isVisible) {
      setDisplayedResult("");
      setIsTyping(false);
      setIsSearching(true);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
      style={{
        opacity: 0,
      }}
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-4xl mx-8 pointer-events-auto"
        style={{
          background: "rgba(10, 10, 10, 0.95)",
          borderRadius: "20px",
          border: "3px solid #f30349",
          padding: "48px 56px",
          boxShadow: `
            0 0 60px rgba(243, 3, 73, 0.4),
            0 0 120px rgba(243, 3, 73, 0.2),
            0 30px 80px rgba(0, 0, 0, 0.8)
          `,
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
            color: "rgba(255, 255, 255, 0.25)",
            background: "none",
            border: "none",
            fontSize: "32px",
            cursor: "pointer",
            transition: "color 0.2s",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.25)")}
        >
          x
        </button>

        {/* Header with Nova badge */}
        <div className="flex items-center gap-4 mb-8">
          {/* Nova avatar - glowing red */}
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#f30349",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 900,
              color: "white",
              boxShadow: "0 0 30px rgba(243, 3, 73, 0.7)",
            }}
          >
            N
          </div>

          <div>
            <span
              style={{
                color: "#f30349",
                fontSize: "0.9rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                display: "block",
                textShadow: "0 0 20px rgba(243, 3, 73, 0.8)",
              }}
            >
              NOVA SEARCH
            </span>
            <span
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "0.95rem",
                fontStyle: "italic",
              }}
            >
              {query}
            </span>
          </div>
        </div>

        {/* Content area */}
        {isSearching ? (
          // Searching animation - minimal
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "32px 0",
            }}
          >
            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "10px",
                    height: "10px",
                    background: "#f30349",
                    borderRadius: "50%",
                    boxShadow: "0 0 10px rgba(243, 3, 73, 0.6)",
                    animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "1.1rem",
                fontWeight: 500,
              }}
            >
              Zoeken...
            </span>
          </div>
        ) : (
          // Result display - white text, clean
          <div>
            <p
              style={{
                color: "white",
                fontSize: "1.4rem",
                fontWeight: 500,
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              {displayedResult}
              {isTyping && (
                <span
                  style={{
                    color: "#f30349",
                    textShadow: "0 0 10px rgba(243, 3, 73, 0.8)",
                    animation: "blink 0.5s infinite",
                  }}
                >
                  |
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
