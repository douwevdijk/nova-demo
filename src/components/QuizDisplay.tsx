"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import type { QuizData } from "@/lib/realtime-client";

const QUIZ_MUSIC_URL = "/quiz-music.mp3";
const TIMER_SECONDS = 30;

interface QuizDisplayProps {
  data: QuizData;
  onClose: () => void;
}

export function QuizDisplay({ data, onClose }: QuizDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const timerCircleRef = useRef<SVGCircleElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [prevIndex, setPrevIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = data.questions[data.currentIndex];
  const score = data.results.filter(r => r === true).length;
  const total = data.results.filter(r => r !== null).length;

  if (!question && !data.showSummary) return null;

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio(QUIZ_MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.08;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start/stop music and timer when question changes or answer is revealed
  useEffect(() => {
    if (data.answerRevealed) {
      // Stop music and timer when answer is shown
      if (audioRef.current) {
        // Fade out music
        const audio = audioRef.current;
        const fadeOut = setInterval(() => {
          if (audio.volume > 0.03) {
            audio.volume = Math.max(0, audio.volume - 0.03);
          } else {
            clearInterval(fadeOut);
            audio.pause();
            audio.volume = 0.25;
          }
        }, 50);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (data.currentIndex >= 0) {
      // New question: start music + timer
      setTimeLeft(TIMER_SECONDS);
      if (audioRef.current && !isMuted) {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.08;
        audioRef.current.play().catch(() => {});
      }
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [data.currentIndex, data.answerRevealed, isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (audioRef.current) {
        if (next) {
          audioRef.current.pause();
        } else if (!data.answerRevealed) {
          audioRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  }, [data.answerRevealed]);

  // Entry animation when question changes
  useEffect(() => {
    if (containerRef.current && data.currentIndex !== prevIndex) {
      setPrevIndex(data.currentIndex);
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );
    }
  }, [data.currentIndex, prevIndex]);

  // Timer circle animation
  useEffect(() => {
    if (timerCircleRef.current) {
      const circumference = 2 * Math.PI * 54;
      const progress = timeLeft / TIMER_SECONDS;
      gsap.to(timerCircleRef.current, {
        strokeDashoffset: circumference * (1 - progress),
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, [timeLeft]);

  // Answer reveal animation
  useEffect(() => {
    if (data.answerRevealed && answerRef.current) {
      gsap.fromTo(
        answerRef.current,
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    }
    if (data.answerRevealed && backgroundRef.current) {
      gsap.fromTo(
        backgroundRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.3 }
      );
    }
  }, [data.answerRevealed, data.currentIndex]);

  const circumference = 2 * Math.PI * 54;
  const isUrgent = timeLeft <= 5 && timeLeft > 0 && !data.answerRevealed;

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
          border: `3px solid ${isUrgent ? "rgba(243, 3, 73, 0.8)" : "rgba(243, 3, 73, 0.4)"}`,
          padding: "56px 64px",
          boxShadow: isUrgent
            ? "0 50px 100px rgba(0, 0, 0, 0.8), 0 0 200px rgba(243, 3, 73, 0.3)"
            : "0 50px 100px rgba(0, 0, 0, 0.8), 0 0 150px rgba(243, 3, 73, 0.15)",
          opacity: 0,
          transition: "border-color 0.3s, box-shadow 0.3s",
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

        {/* Mute button */}
        <button
          onClick={toggleMute}
          style={{
            position: "absolute",
            top: "24px",
            right: "72px",
            color: "rgba(255, 255, 255, 0.25)",
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            transition: "color 0.2s",
            lineHeight: 1,
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.25)")}
          title={isMuted ? "Geluid aan" : "Geluid uit"}
        >
          {isMuted ? "\u{1F507}" : "\u{1F50A}"}
        </button>

        {/* Timer circle - top center, overlapping the card */}
        {!data.answerRevealed && (
          <div
            style={{
              position: "absolute",
              top: "-48px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "96px",
              height: "96px",
            }}
          >
            <svg width="96" height="96" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
              {/* Background circle */}
              <circle
                cx="60" cy="60" r="54"
                fill="rgba(10, 10, 10, 0.95)"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="6"
              />
              {/* Progress circle */}
              <circle
                ref={timerCircleRef}
                cx="60" cy="60" r="54"
                fill="none"
                stroke={isUrgent ? "#f30349" : "#195969"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={0}
                style={{
                  filter: isUrgent ? "drop-shadow(0 0 8px #f30349)" : "drop-shadow(0 0 6px #195969)",
                  transition: "stroke 0.3s, filter 0.3s",
                }}
              />
            </svg>
            {/* Timer number */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: isUrgent ? "2.2rem" : "2rem",
                color: isUrgent ? "#f30349" : "white",
                fontVariantNumeric: "tabular-nums",
                transition: "color 0.3s, font-size 0.3s",
                animation: isUrgent ? "timerPulse 1s ease-in-out infinite" : "none",
              }}
            >
              {timeLeft}
            </div>
          </div>
        )}

        {/* Question counter + topic */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", marginTop: !data.answerRevealed ? "16px" : 0 }}>
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
            ?
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
              NOVA QUIZ
            </span>
            <h2 style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "1.2rem", fontWeight: 600, lineHeight: 1.3, margin: 0 }}>
              {data.showSummary ? "Resultaten" : `Vraag ${data.currentIndex + 1} van ${data.questions.length}`}
              <span style={{ color: "rgba(255, 255, 255, 0.25)", marginLeft: "16px", fontSize: "1rem" }}>
                {data.topic}
              </span>
            </h2>
          </div>
        </div>

        {/* Quiz content: either questions or summary */}
        {data.showSummary ? (
          <>
            {/* Score summary */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{
                fontSize: "4rem",
                fontWeight: 900,
                color: "white",
                marginBottom: "8px",
              }}>
                {score}/{data.questions.length}
              </div>
              <div style={{
                fontSize: "1.2rem",
                color: "rgba(255, 255, 255, 0.5)",
                fontWeight: 500,
              }}>
                {score === data.questions.length ? "Perfect!" : score >= data.questions.length / 2 ? "Goed gedaan!" : "Volgende keer beter!"}
              </div>
            </div>

            {/* Question results list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.questions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px 20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "12px",
                    border: `1px solid ${data.results[i] === true ? "rgba(34, 197, 94, 0.3)" : data.results[i] === false ? "rgba(243, 3, 73, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                  }}
                >
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: data.results[i] === true ? "rgba(34, 197, 94, 0.2)" : data.results[i] === false ? "rgba(243, 3, 73, 0.2)" : "rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}>
                    {data.results[i] === true ? "\u2713" : data.results[i] === false ? "\u2717" : "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>{q.text}</div>
                    <div style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.85rem", marginTop: "2px" }}>{q.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Question text */}
            <h1
              style={{
                color: "white",
                fontSize: "2.4rem",
                fontWeight: 700,
                lineHeight: 1.4,
                margin: "0 0 40px 0",
              }}
            >
              {question?.text}
            </h1>

            {/* Answer reveal */}
            {data.answerRevealed && question && (
              <>
                <div
                  ref={answerRef}
                  style={{
                    display: "inline-block",
                    padding: "16px 40px",
                    background: "rgba(243, 3, 73, 0.15)",
                    border: "2px solid rgba(243, 3, 73, 0.5)",
                    borderRadius: "16px",
                    opacity: 0,
                  }}
                >
                  <span
                    style={{
                      color: "#f30349",
                      fontSize: "2rem",
                      fontWeight: 800,
                    }}
                  >
                    {question.answer}
                  </span>
                </div>

                {/* Background info */}
                <div
                  ref={backgroundRef}
                  style={{
                    marginTop: "24px",
                    opacity: 0,
                  }}
                >
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.55)",
                      fontSize: "1.2rem",
                      fontWeight: 400,
                      lineHeight: 1.6,
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    {question.background}
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            paddingTop: "16px",
          }}
        >
          {/* Progress dots */}
          <div style={{ display: "flex", gap: "6px" }}>
            {data.questions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: data.results[i] === true
                    ? "#22c55e"
                    : data.results[i] === false
                      ? "#f30349"
                      : i === data.currentIndex
                        ? "white"
                        : "rgba(255, 255, 255, 0.15)",
                  boxShadow: i === data.currentIndex && !data.showSummary ? "0 0 8px rgba(255, 255, 255, 0.4)" : "none",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
            <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>Live</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
