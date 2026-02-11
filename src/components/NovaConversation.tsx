"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { gsap } from "gsap";
import { NovaVisualizer } from "./NovaVisualizer";
import { PollDisplay } from "./PollDisplay";
import { PollDeepDiveDisplay } from "./PollDeepDiveDisplay";
import { WebSearchOverlay } from "./WebSearchOverlay";
import { OpenVraagDisplay } from "./OpenVraagDisplay";
import { OpenVraagDeepDiveDisplay } from "./OpenVraagDeepDiveDisplay";
import { NovaSummaryDisplay } from "./NovaSummaryDisplay";
import { NovaImageDisplay } from "./NovaImageDisplay";
import { SeatAllocationDisplay } from "./SeatAllocationDisplay";
import {
  RealtimeClient,
  type ConnectionState,
  type PollData,
  type PollDeepDive,
  type WebSearchData,
  type OpenVraagData,
  type OpenVraagDeepDive,
  type NovaSummaryData,
  type NovaImageData,
  type SeatAllocationData,
} from "@/lib/realtime-client";
import { QRCodeSVG } from "qrcode.react";
import { generateCampaignId, createCampaign, saveQuestions, setQuestionActive, subscribeToQuestions, subscribeToActiveQuestionResults, deactivateQuestion, type PreparedQuestion } from "@/lib/firebase";
import { QuestionManager, type QuestionDisplayData, type PollResultItem as QMPollResultItem, type OpenAnswer } from "@/lib/question-manager";

type ActiveModal = "none" | "poll" | "polldeep-regions" | "polldeep-profiles" | "websearch" | "openvraag" | "openvraagdeep" | "summary" | "image" | "seats";

// Cheat Sheet flow section helper
function FlowSection({ title, color, items }: {
  title: string;
  color: string;
  items: { step?: string; cmd: string; desc: string }[];
}) {
  const alpha = (a: number) => {
    const m = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return color;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`;
  };
  return (
    <div style={{ background: alpha(0.06), border: `1px solid ${alpha(0.18)}`, borderRadius: "16px", padding: "28px" }}>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "20px" }}>
        {title}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "14px", alignItems: "baseline", marginBottom: "14px" }}>
          <span style={{ color: alpha(0.45), fontSize: "1rem", fontWeight: 700, flexShrink: 0, minWidth: "16px" }}>
            {item.step || "\u2022"}
          </span>
          <div>
            <span style={{ color: "white", fontSize: "1.25rem", fontWeight: 600 }}>&ldquo;{item.cmd}&rdquo;</span>
            <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "1.1rem", marginLeft: "10px" }}>{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Cheat Sheet Modal Component
function CheatSheetModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        animation: "fadeInSetup 0.25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "94vw",
          maxWidth: "1400px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(8, 8, 12, 0.99)",
          border: "1px solid rgba(25, 89, 105, 0.25)",
          borderRadius: "24px",
          padding: "48px 56px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div>
            <h2 style={{ color: "white", fontSize: "2.4rem", fontWeight: 700, margin: 0 }}>
              Nova Commando&apos;s
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "1.2rem", margin: "8px 0 0" }}>
              Praat gewoon tegen Nova — zij regelt de rest
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            &times;
          </button>
        </div>

        {/* Flow sections grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "24px",
        }}>

          {/* ALGEMEEN */}
          <FlowSection
            title="Algemeen"
            color="#ffffff"
            items={[
              { cmd: "Hoi Nova / Stel je voor", desc: "Nova stelt zichzelf voor" },
              { cmd: "Vertel over NOVA AI", desc: "Uitleg over het platform" },
              { cmd: "Ja / Top / Doen", desc: "Bevestig een voorstel" },
              { cmd: "Nee / Anders", desc: "Nova maakt een nieuw voorstel" },
              { cmd: "Gewoon praten", desc: "Nova is proactief, je hoeft geen exacte woorden te gebruiken" },
              { cmd: "Doorvragen na resultaten", desc: "Na elke poll of open vraag: inzoomen, samenvatten, of plaatje maken" },
            ]}
          />

          {/* POLLS */}
          <FlowSection
            title="Polls"
            color="#f30349"
            items={[
              { step: "1", cmd: "Maak een poll over...", desc: "Nova stelt een poll voor" },
              { step: "2", cmd: "Bevestig of wijzig", desc: "Pas opties aan of keur goed" },
              { step: "3", cmd: "Toon resultaten", desc: "Staafdiagram met percentages" },
              { step: "4", cmd: "Zoom in / Per regio", desc: "Kaart van Nederland" },
              { step: "5", cmd: "Per profiel", desc: "Analyse per klantprofiel" },
              { step: "6", cmd: "Zetelverdeling", desc: "Resultaten als parlement" },
            ]}
          />

          {/* OPEN VRAGEN */}
          <FlowSection
            title="Open Vragen"
            color="#195969"
            items={[
              { step: "1", cmd: "Stel een open vraag over...", desc: "Nova stelt een vraag voor" },
              { step: "2", cmd: "Bevestig of wijzig", desc: "Pas aan of keur goed" },
              { step: "3", cmd: "Toon resultaten", desc: "Antwoorden als kaartjes" },
              { step: "4", cmd: "Zoom in / Deep dive", desc: "Per regio en profiel" },
            ]}
          />

          {/* ANALYSE & CONTENT */}
          <FlowSection
            title="Analyse & Content"
            color="#9333ea"
            items={[
              { cmd: "Vat samen / Conclusie", desc: "Samenvatting op scherm" },
              { cmd: "Geef me 6 highlights", desc: "Kernpunten als lijst" },
              { cmd: "Maak er een gedicht van", desc: "Creatieve content" },
              { cmd: "Analyseer in 3 zinnen", desc: "Korte analyse op scherm" },
            ]}
          />

          {/* AFBEELDINGEN */}
          <FlowSection
            title="Afbeeldingen"
            color="#f59e0b"
            items={[
              { step: "1", cmd: "Maak een plaatje / Visualiseer", desc: "Genereert op achtergrond (~15 sec)" },
              { step: "2", cmd: "Toon het plaatje", desc: "Toont op scherm" },
            ]}
          />

          {/* INTERNET */}
          <FlowSection
            title="Internet Zoeken"
            color="#10b981"
            items={[
              { step: "1", cmd: "Zoek op...", desc: "Nova zoekt het internet af" },
              { step: "2", cmd: "Toon de resultaten", desc: "Zet op scherm" },
            ]}
          />
        </div>

      </div>
    </div>
  );
}

// Epic Nova Title Component with GSAP animations
function NovaTitle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nRef = useRef<HTMLSpanElement>(null);
  const oRef = useRef<HTMLSpanElement>(null);
  const vRef = useRef<HTMLSpanElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const aiRef = useRef<HTMLSpanElement>(null);
  const nGlowRef = useRef<HTMLDivElement>(null);
  const orbitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !nRef.current) return;

    const ctx = gsap.context(() => {
      const letters = [nRef.current, oRef.current, vRef.current, aRef.current];

      // Initial state
      gsap.set(letters, { opacity: 0, scale: 0, rotationY: -180 });
      gsap.set(aiRef.current, { opacity: 0, scale: 0, x: -20 });
      gsap.set(nGlowRef.current, { scale: 0, opacity: 0 });

      // Epic entrance timeline
      const tl = gsap.timeline({ delay: 0.2 });

      // N glow builds up first
      tl.to(nGlowRef.current, {
        scale: 1.5,
        opacity: 0.8,
        duration: 0.4,
        ease: "power2.out",
      });

      // N explodes in with 3D flip
      tl.to(nRef.current, {
        opacity: 1,
        scale: 1,
        rotationY: 0,
        duration: 0.7,
        ease: "back.out(2)",
      }, "-=0.2");

      // Shockwave from N
      tl.to(nGlowRef.current, {
        scale: 3,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      }, "-=0.3");

      // Reset glow for continuous pulse
      tl.set(nGlowRef.current, { scale: 1, opacity: 0.6 });

      // O, V, A cascade in with stagger
      tl.to([oRef.current, vRef.current, aRef.current], {
        opacity: 1,
        scale: 1,
        rotationY: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "back.out(1.5)",
      }, "-=0.2");

      // AI badge pops in
      tl.to(aiRef.current, {
        opacity: 1,
        scale: 1,
        x: 0,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
      }, "-=0.1");

      // Letters stay static after entrance - no continuous letter animations

      // Create orbital particles around N (these keep animating)
      if (orbitsRef.current) {
        for (let i = 0; i < 10; i++) {
          const particle = document.createElement("div");
          const size = Math.random() * 5 + 2;
          const isRed = Math.random() > 0.6;
          const radius = 40 + Math.random() * 30;
          const duration = 3 + Math.random() * 2;
          const delay = (i / 10) * duration;

          particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${isRed ? "#f30349" : "#195969"};
            border-radius: 50%;
            box-shadow: 0 0 ${size * 3}px ${isRed ? "#f30349" : "#195969"};
            pointer-events: none;
            left: 50%;
            top: 50%;
            margin-left: -${size/2}px;
            margin-top: -${size/2}px;
          `;
          orbitsRef.current.appendChild(particle);

          // Circular orbit using x/y
          const orbitTl = gsap.timeline({ repeat: -1, delay: delay });
          const steps = 60;
          for (let s = 0; s <= steps; s++) {
            const angle = (s / steps) * Math.PI * 2;
            orbitTl.to(particle, {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
              duration: duration / steps,
              ease: "none",
            });
          }

          // Pulse opacity
          gsap.to(particle, {
            opacity: 0.3,
            duration: 1 + Math.random(),
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: Math.random(),
          });
        }
      }

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "flex-start",
        marginBottom: "28px",
      }}
    >
      {/* Orbital particles container - centered on N */}
      <div
        ref={orbitsRef}
        style={{
          position: "absolute",
          left: "32px",
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />

      {/* N background glow */}
      <div
        ref={nGlowRef}
        style={{
          position: "absolute",
          width: "100px",
          height: "100px",
          left: "-10px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "radial-gradient(circle, rgba(25, 89, 105, 0.8) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      {/* NOVA letters */}
      <span
        ref={nRef}
        style={{
          fontSize: "4rem",
          fontWeight: 900,
          color: "#195969",
          textShadow: "0 0 30px rgba(25, 89, 105, 0.8), 0 0 60px rgba(25, 89, 105, 0.5)",
          position: "relative",
          zIndex: 2,
          display: "inline-block",
          transformStyle: "preserve-3d",
        }}
      >
        N
      </span>
      <span
        ref={oRef}
        style={{
          fontSize: "4rem",
          fontWeight: 800,
          color: "white",
          position: "relative",
          zIndex: 2,
          display: "inline-block",
          marginLeft: "-2px",
        }}
      >
        O
      </span>
      <span
        ref={vRef}
        style={{
          fontSize: "4rem",
          fontWeight: 800,
          color: "white",
          position: "relative",
          zIndex: 2,
          display: "inline-block",
        }}
      >
        V
      </span>
      <span
        ref={aRef}
        style={{
          fontSize: "4rem",
          fontWeight: 800,
          color: "white",
          position: "relative",
          zIndex: 2,
          display: "inline-block",
        }}
      >
        A
      </span>

      {/* AI superscript badge */}
      <span
        ref={aiRef}
        style={{
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "#f30349",
          letterSpacing: "0.05em",
          marginLeft: "4px",
          marginTop: "4px",
          padding: "3px 8px",
          background: "rgba(243, 3, 73, 0.15)",
          border: "1px solid rgba(243, 3, 73, 0.4)",
          borderRadius: "6px",
          position: "relative",
          zIndex: 2,
          textTransform: "uppercase",
          boxShadow: "0 0 10px rgba(243, 3, 73, 0.3)",
          alignSelf: "flex-start",
        }}
      >
        AI
      </span>
    </div>
  );
}

// Notification sound for when image is ready
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Two-tone chime: ascending notes
    [0, 0.15].forEach((delay, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = i === 0 ? 587 : 880; // D5 → A5
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.4);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + 0.4);
    });
  } catch (e) {
    console.log("Could not play notification sound", e);
  }
}

export function NovaConversation() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [novaAudioLevel, setNovaAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<PollData | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const deepDiveLoadingRef = useRef(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [webSearch, setWebSearch] = useState<WebSearchData | null>(null);
  const [openVraag, setOpenVraag] = useState<OpenVraagData | null>(null);
  const [pollDeepDive, setPollDeepDive] = useState<PollDeepDive | null>(null);
  const [openVraagDeepDive, setOpenVraagDeepDive] = useState<OpenVraagDeepDive | null>(null);
  const [openVraagDeepQuestion, setOpenVraagDeepQuestion] = useState("");
  const [novaSummary, setNovaSummary] = useState<NovaSummaryData | null>(null);
  const [novaImage, setNovaImage] = useState<NovaImageData | null>(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imagePending, setImagePending] = useState<NovaImageData | null>(null);
  const [searchSearching, setSearchSearching] = useState(false);
  const [searchPending, setSearchPending] = useState<{ query: string; result: string } | null>(null);
  const [seatAllocation, setSeatAllocation] = useState<SeatAllocationData | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>("none");
  const clientRef = useRef<RealtimeClient | null>(null);
  const questionManagerRef = useRef<QuestionManager | null>(null);

  // Campaign ID - generated once on mount, unique per session
  const campaignId = useMemo(() => generateCampaignId(), []);
  const [campaignReady, setCampaignReady] = useState(false);


  // Create campaign in Firebase on mount
  useEffect(() => {
    const initCampaign = async () => {
      try {
        await createCampaign(campaignId);
        setCampaignReady(true);
        console.log("Campaign created:", campaignId);
      } catch (err) {
        console.error("Failed to create campaign:", err);
      }
    };
    initCampaign();
  }, [campaignId]);

  // Vote URL for participants
  const voteUrl = `/vote/${campaignId}`;

  // Setup / context state
  const [showSetup, setShowSetup] = useState(false);
  const [setupTopic, setSetupTopic] = useState("");
  const [setupAudience, setSetupAudience] = useState("");
  const [setupTone, setSetupTone] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [questionCount, setQuestionCount] = useState(3);
  const [questionType, setQuestionType] = useState<"mix" | "poll" | "open">("mix");
  const [generatedQuestions, setGeneratedQuestions] = useState<{
    type: string;
    question: string;
    options?: string[];
    seedVotes?: { option: string; count: number }[];
    seedAnswers?: string[];
  }[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<PreparedQuestion[]>([]);
  const [questionsConfirmed, setQuestionsConfirmed] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [sessionBriefing, setSessionBriefing] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [showQuestionMenu, setShowQuestionMenu] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [firebaseQuestions, setFirebaseQuestions] = useState<PreparedQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<PreparedQuestion | null>(null);
  const [activeQuestionResults, setActiveQuestionResults] = useState<{
    votes?: { option: string; count: number }[];
    answers?: { text: string; name?: string }[];
  } | null>(null);

  // Refs to always have current values for QuestionManager/RealtimeClient (avoids stale closures)
  const activeQuestionRef = useRef<PreparedQuestion | null>(null);
  const activeQuestionResultsRef = useRef<typeof activeQuestionResults>(null);

  // Keep refs in sync with state
  useEffect(() => {
    activeQuestionRef.current = activeQuestion;
  }, [activeQuestion]);

  useEffect(() => {
    activeQuestionResultsRef.current = activeQuestionResults;
  }, [activeQuestionResults]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CENTRALE FUNCTIE: Open vraag modal (voor handmatig EN Nova)
  // ═══════════════════════════════════════════════════════════════════════════
  const openQuestionModal = useCallback((showResults: boolean) => {
    const question = activeQuestionRef.current;
    if (!question) {
      console.warn("[openQuestionModal] Geen actieve vraag");
      return { success: false, message: "Geen actieve vraag" };
    }

    if (question.type === "poll") {
      // Poll modal
      if (showResults && activeQuestionResultsRef.current?.votes) {
        const votes = activeQuestionResultsRef.current.votes;
        const totalVotes = votes.reduce((sum, v) => sum + v.count, 0);
        const resultsWithPercentage = votes.map(v => ({
          option: v.option,
          votes: v.count,
          percentage: totalVotes > 0 ? Math.round((v.count / totalVotes) * 100) : 0,
        }));
        setCurrentPoll({
          question: question.title,
          options: question.options || [],
          results: resultsWithPercentage,
        });
      } else {
        setCurrentPoll({
          question: question.title,
          options: question.options || [],
        });
      }
      setActiveModal("poll");
    } else {
      // Open vraag modal
      if (showResults && activeQuestionResultsRef.current?.answers) {
        const answers = activeQuestionResultsRef.current.answers;
        setOpenVraag({
          question: question.title,
          showResults: true,
          words: answers.map(a => ({
            text: a.text,
            count: 1,
            name: a.name || "Anoniem",
          })),
        });
      } else {
        setOpenVraag({
          question: question.title,
          showResults: false,
        });
      }
      setActiveModal("openvraag");
    }

    return { success: true, message: `Vraag "${question.title}" wordt getoond` };
  }, []);

  // Subscribe to Firebase questions - ALWAYS when campaignId exists
  // This fills both firebaseQuestions (for sidebar) and activeQuestion (for Nova)
  useEffect(() => {
    if (!campaignId) return;

    console.log("[Firebase] Starting questions listener for campaign:", campaignId);
    const unsubscribe = subscribeToQuestions(campaignId, (questions) => {
      const active = questions.find(q => q.active) || null;
      console.log("[Firebase] Questions updated:", questions.length, "questions, active:", active?.id || "none");
      setFirebaseQuestions(questions);
      setActiveQuestion(active);
      activeQuestionRef.current = active;
    });

    return () => unsubscribe();
  }, [campaignId]);

  // Subscribe to active question results - NO connectionState dependency!
  // This ensures results are always up-to-date when there's an active question
  useEffect(() => {
    if (!campaignId || !activeQuestion) {
      setActiveQuestionResults(null);
      activeQuestionResultsRef.current = null;
      return;
    }

    console.log("[Firebase] Starting results listener for question:", activeQuestion.id);
    const unsubscribe = subscribeToActiveQuestionResults(
      campaignId,
      activeQuestion.id,
      activeQuestion.type,
      activeQuestion.options,
      (data) => {
        // Convert to our format
        const results = {
          votes: data.seedVotes,
          answers: data.seedAnswers?.map(a => ({ text: a.text, name: a.name })),
        };
        console.log("[Firebase] Results updated for question:", activeQuestion.id);
        setActiveQuestionResults(results);
        activeQuestionResultsRef.current = results;
      }
    );

    return () => {
      console.log("[Firebase] Stopping results listener for question:", activeQuestion.id);
      unsubscribe();
    };
  }, [campaignId, activeQuestion]);

  const handleConnect = useCallback(async () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    // Create QuestionManager instance with getters and callbacks
    // IMPORTANT: Use refs instead of state to avoid stale closures!
    const questionManager = new QuestionManager({
      campaignId,
      getActiveQuestion: () => {
        const active = activeQuestionRef.current;
        console.log("[QuestionManager] getActiveQuestion called, found:", active?.id || "null");
        if (!active) return null;
        return {
          question: active,
          votes: activeQuestionResultsRef.current?.votes,
          answers: activeQuestionResultsRef.current?.answers,
        };
      },
      getAllQuestions: () => {
        return firebaseQuestions;
      },
      onShowQuestion: () => openQuestionModal(false),
      onShowResults: () => openQuestionModal(true),
    });
    questionManagerRef.current = questionManager;

    const client = new RealtimeClient({
      campaignId, // Pass campaign ID to RealtimeClient for Firebase operations
      questionManager, // Pass QuestionManager for centralized question handling
      onConnectionStateChange: (state) => {
        setConnectionState(state);
        if (state === "connected") {
          setTimeout(() => setShowVisualizer(true), 500);
        } else if (state === "disconnected") {
          setShowVisualizer(false);
        }
      },
      onNovaStateChange: () => {},
      onTranscript: () => {},
      onError: setError,
      onAudioLevel: () => {},
      onNovaAudioLevel: setNovaAudioLevel,
      onPollStart: (poll) => {
        console.log("Poll started:", poll);
        setActiveModal("poll");
        setCurrentPoll(poll);
        setIsThinking(false);
      },
      onPollResults: (poll) => {
        console.log("Poll results:", poll);
        setActiveModal("poll");
        setCurrentPoll({ ...poll });
        setIsThinking(false);
      },
      onFunctionCallStart: (name: string) => {
        // Skip top-right notification for functions that have their own UI feedback
        // - generate_image / web_search: have their own left-side notifications
        const skipNotification = [
          "generate_image",
          "web_search",
        ].includes(name);

        if (skipNotification) {
          // Don't show top-right thinking indicator
          return;
        }

        setIsThinking(true);
        if (name === "propose_poll") {
          setThinkingMessage("Voorstel maken...");
        } else if (name === "propose_open_vraag") {
          setThinkingMessage("Voorstel maken...");
        } else if (name === "confirm_question") {
          setThinkingMessage("Vraag live zetten...");
        } else if (name === "get_poll_results") {
          setThinkingMessage("Resultaten ophalen...");
        } else if (name === "get_open_vraag_results") {
          setThinkingMessage("Antwoorden ophalen...");
        } else if (name === "analyze_poll_regions") {
          setThinkingMessage("Regio-analyse laden...");
        } else if (name === "analyze_poll_profiles") {
          setThinkingMessage("Profiel-analyse laden...");
        } else if (name === "analyze_open_vraag_deep") {
          setThinkingMessage("Deep dive laden...");
        } else if (name === "show_summary") {
          setThinkingMessage("Samenvatting maken...");
        } else if (name === "show_seat_allocation") {
          setThinkingMessage("Zetelverdeling laden...");
        } else if (name === "show_generated_image") {
          setThinkingMessage("Image tonen...");
        } else {
          setThinkingMessage("Even nadenken...");
        }
      },
      onFunctionCallEnd: () => {
        if (deepDiveLoadingRef.current) return; // deep dive timeout handles clearing
        setIsThinking(false);
        setThinkingMessage("");
      },
      onWebSearchStart: (query) => {
        console.log("Web search started:", query);
        setSearchSearching(true);
        setSearchPending(null);
      },
      onWebSearchResult: (data) => {
        console.log("Web search result:", data);
        setSearchSearching(false);
        setSearchPending({ query: data.query, result: data.result || "" });
        playNotificationSound();
      },
      onOpenVraagStart: (data) => {
        console.log("Open vraag started:", data);
        setActiveModal("openvraag");
        setOpenVraag({ ...data, showResults: false });
      },
      onOpenVraagResults: (data) => {
        console.log("Open vraag results:", data);
        setActiveModal("openvraag");
        setOpenVraag({ ...data, showResults: true });
      },
      onOpenVraagDeepDive: (data) => {
        console.log("Open vraag deep dive:", data);
        setActiveModal("openvraagdeep");
        setOpenVraagDeepDive(data.deepDive);
        setOpenVraagDeepQuestion(data.question);
      },
      onNovaSummary: (data) => {
        console.log("Nova summary:", data);
        setActiveModal("summary");
        setNovaSummary(data);
        // Clear search pending notification when summary is shown (results have been presented)
        setSearchPending(null);
      },
      onImageGenerating: () => {
        console.log("Image generation started");
        setImageGenerating(true);
      },
      onImageReady: (data) => {
        console.log("Image ready:", data.prompt);
        setImageGenerating(false);
        setImagePending(data);
        playNotificationSound();
      },
      onShowImage: (data) => {
        console.log("Show image:", data.prompt);
        setNovaImage(data);
        setImagePending(null);
        setActiveModal("image");
      },
      onImageError: (error) => {
        console.error("Image error:", error);
        setImageGenerating(false);
      },
      onSeatAllocation: (data) => {
        console.log("Seat allocation:", data.question);
        setSeatAllocation(data);
        setActiveModal("seats");
      },
      onPollDeepDiveRegions: (data) => {
        console.log("Poll deep dive regions:", data);
        deepDiveLoadingRef.current = true;
        setActiveModal("polldeep-regions");
        setPollDeepDive(data);
        setTimeout(() => {
          deepDiveLoadingRef.current = false;
          setIsThinking(false);
          setThinkingMessage("");
        }, 800);
      },
      onPollDeepDiveProfiles: (data) => {
        console.log("Poll deep dive profiles:", data);
        deepDiveLoadingRef.current = true;
        setActiveModal("polldeep-profiles");
        setPollDeepDive(data);
        setTimeout(() => {
          deepDiveLoadingRef.current = false;
          setIsThinking(false);
          setThinkingMessage("");
        }, 800);
      },
    });

    clientRef.current = client;
    await client.connect(
      sessionBriefing
        ? { context: sessionBriefing }
        : undefined
    );
  }, [sessionBriefing, campaignId]); // Refs are used for activeQuestionData and firebaseQuestions to avoid stale closures

  const handlePrepareSession = useCallback(async () => {
    if (!setupTopic.trim()) return;
    setIsPreparing(true);
    try {
      const res = await fetch("/api/prepare-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: setupTopic,
          audience: setupAudience,
          tone: setupTone,
          notes: setupNotes,
          questionCount,
          questionType,
        }),
      });
      const data = await res.json();
      if (data.briefing) {
        setSessionBriefing(data.briefing);
      }
      if (data.questions) {
        setGeneratedQuestions(data.questions);
      }
    } catch (err) {
      console.error("Failed to prepare session:", err);
    }
    setIsPreparing(false);
  }, [setupTopic, setupAudience, setupTone, setupNotes, questionCount, questionType]);

  // Confirm and save questions to Firebase
  const handleConfirmQuestions = useCallback(async () => {
    if (generatedQuestions.length === 0 || !campaignId) return;

    setIsSavingQuestions(true);
    try {
      const saved = await saveQuestions(
        campaignId,
        generatedQuestions.map(q => ({
          type: q.type as "poll" | "open",
          question: q.question,
          options: q.options,
          seedVotes: q.seedVotes,
          seedAnswers: q.seedAnswers,
        }))
      );
      setSavedQuestions(saved);
      setQuestionsConfirmed(true);
    } catch (err) {
      console.error("Failed to save questions:", err);
    }
    setIsSavingQuestions(false);
  }, [generatedQuestions, campaignId]);

  // Cancel prepared questions (discard without saving)
  const handleCancelQuestions = useCallback(() => {
    setGeneratedQuestions([]);
    setSavedQuestions([]);
    setQuestionsConfirmed(false);
  }, []);

  // Set a question as live (active in Firebase)
  // The listener will automatically update activeQuestion when Firebase changes
  const handleSetQuestionLive = useCallback(async (questionId: string) => {
    if (!campaignId) return;

    try {
      // Set active in Firebase - the listener will update activeQuestion automatically
      await setQuestionActive(campaignId, questionId);
    } catch (err) {
      console.error("Failed to set question live:", err);
    }
  }, [campaignId]);

  // Notify Nova when active question changes (NOT on every result update!)
  // Nova fetches results on-demand via getResults() — no need to spam notifications
  useEffect(() => {
    if (!activeQuestion || !clientRef.current) return;

    let notification = `[SYSTEEM NOTIFICATIE - ACTIEVE VRAAG]\n\n`;

    if (activeQuestion.type === "poll" && activeQuestion.options) {
      notification += `TYPE: POLL\n`;
      notification += `VRAAG: "${activeQuestion.title}"\n`;
      notification += `OPTIES: ${JSON.stringify(activeQuestion.options)}\n`;
      notification += `\nDit is puur informatief. Reageer hier NIET op. Als Rens om een vraag/poll vraagt, roep METEEN propose_poll/propose_open_vraag aan.`;
    } else {
      notification += `TYPE: OPEN VRAAG\n`;
      notification += `VRAAG: "${activeQuestion.title}"\n`;
      notification += `\nDit is puur informatief. Reageer hier NIET op. Als Rens om een vraag/poll vraagt, roep METEEN propose_poll/propose_open_vraag aan.`;
    }

    clientRef.current.sendSilentConversationEvent(notification);
  }, [activeQuestion]);

  // Clear live question (deactivate in Firebase)
  const handleClearLiveQuestion = useCallback(async () => {
    if (activeQuestion && campaignId) {
      try {
        await deactivateQuestion(campaignId, activeQuestion.id);
      } catch (err) {
        console.error("Failed to deactivate question:", err);
      }
    }
  }, [activeQuestion, campaignId]);

  const handleDisconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setShowVisualizer(false);
  }, []);


  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";
  const isError = connectionState === "error";

  // Landing page — only show when truly disconnected (not on error during session)
  if (!isConnected && !isConnecting && !isError) {
    return (
    <>
      <div className="fixed inset-0 overflow-hidden" style={{ background: "#0a0a0a" }}>
        {/* Subtle radial background */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, rgba(25, 89, 105, 0.12) 0%, transparent 50%)",
          }}
        />

        {/* Animated pulse rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: `${280 + i * 140}px`,
              height: `${280 + i * 140}px`,
              border: `2px solid rgba(25, 89, 105, ${0.25 - i * 0.07})`,
              transform: "translate(-50%, -50%)",
              animation: `pulse-expand ${3.5 + i * 0.4}s ease-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ overflow: "hidden", padding: "40px 20px" }}>
          {/* NOVA AI - Epic animated title */}
          <NovaTitle />

          {/* Setup panel toggle */}
          {!showSetup && (
            <button
              onClick={() => setShowSetup(true)}
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: "0.8rem",
                fontWeight: 500,
                letterSpacing: "2px",
                textTransform: "uppercase",
                padding: "8px 20px",
                borderRadius: "20px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginBottom: "24px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)";
              }}
            >
              + Context toevoegen
            </button>
          )}

          {/* Setup panel */}
          {showSetup && (
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                maxHeight: "60vh",
                overflowY: "auto",
                marginBottom: "32px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
                padding: "28px",
                animation: "fadeInSetup 0.3s ease",
              }}
            >
              {/* Onderwerp */}
              <input
                type="text"
                value={setupTopic}
                onChange={(e) => setSetupTopic(e.target.value)}
                placeholder="Onderwerp (bijv. AI adoptie bij gemeenten)"
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "white",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(25, 89, 105, 0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"; }}
              />

              {/* Publiek + Toon row */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <input
                  type="text"
                  value={setupAudience}
                  onChange={(e) => setSetupAudience(e.target.value)}
                  placeholder="Publiek (bijv. managers, studenten)"
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "white",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(25, 89, 105, 0.5)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"; }}
                />
                <input
                  type="text"
                  value={setupTone}
                  onChange={(e) => setSetupTone(e.target.value)}
                  placeholder="Toon (bijv. energiek, casual)"
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "white",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(25, 89, 105, 0.5)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"; }}
                />
              </div>

              {/* Extra notities */}
              <textarea
                value={setupNotes}
                onChange={(e) => setSetupNotes(e.target.value)}
                placeholder="Extra notities (optioneel)"
                style={{
                  width: "100%",
                  minHeight: "60px",
                  marginTop: "10px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "white",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(25, 89, 105, 0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"; }}
              />

              {/* Question generation controls */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "rgba(255, 255, 255, 0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>
                  Vragen genereren
                </div>

                {/* Question type pills */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                  {([["mix", "Mix"], ["poll", "Polls"], ["open", "Open"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setQuestionType(val)}
                      style={{
                        background: questionType === val ? "rgba(25, 89, 105, 0.35)" : "rgba(255, 255, 255, 0.06)",
                        border: `1px solid ${questionType === val ? "rgba(25, 89, 105, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                        borderRadius: "20px",
                        padding: "6px 14px",
                        color: questionType === val ? "white" : "rgba(255, 255, 255, 0.45)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <span style={{ width: "1px", background: "rgba(255, 255, 255, 0.1)", margin: "0 4px" }} />
                  {/* Question count pills */}
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      style={{
                        background: questionCount === n ? "rgba(243, 3, 73, 0.2)" : "rgba(255, 255, 255, 0.06)",
                        border: `1px solid ${questionCount === n ? "rgba(243, 3, 73, 0.35)" : "rgba(255, 255, 255, 0.1)"}`,
                        borderRadius: "20px",
                        padding: "6px 11px",
                        color: questionCount === n ? "white" : "rgba(255, 255, 255, 0.45)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        minWidth: "32px",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prepare + Close buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "6px", alignItems: "center" }}>
                <button
                  onClick={handlePrepareSession}
                  disabled={!setupTopic.trim() || isPreparing}
                  style={{
                    background: setupTopic.trim() ? "rgba(25, 89, 105, 0.4)" : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(25, 89, 105, 0.4)",
                    borderRadius: "20px",
                    padding: "9px 20px",
                    color: setupTopic.trim() ? "white" : "rgba(255, 255, 255, 0.3)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: setupTopic.trim() && !isPreparing ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                    opacity: isPreparing ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Voorbereiden
                  {isPreparing && (
                    <span className="loading-dots" style={{ display: "inline-flex", gap: "2px" }}>
                      <span style={{ animation: "dotBlink 1.4s infinite", animationDelay: "0s" }}>.</span>
                      <span style={{ animation: "dotBlink 1.4s infinite", animationDelay: "0.2s" }}>.</span>
                      <span style={{ animation: "dotBlink 1.4s infinite", animationDelay: "0.4s" }}>.</span>
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setShowSetup(false); setSetupTopic(""); setSetupAudience(""); setSetupTone(""); setSetupNotes(""); setSessionBriefing(""); setGeneratedQuestions([]); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.3)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    marginLeft: "auto",
                    padding: "4px 8px",
                  }}
                >
                  Sluiten
                </button>
              </div>

              {/* Briefing confirmation */}
              {sessionBriefing && (
                <div style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  background: "rgba(25, 89, 105, 0.12)",
                  border: "1px solid rgba(25, 89, 105, 0.25)",
                  borderRadius: "8px",
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    Sessie briefing
                  </span>
                  <div style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>{sessionBriefing}</div>
                </div>
              )}

              {/* Generated questions list - NOT YET CONFIRMED */}
              {generatedQuestions.length > 0 && !questionsConfirmed && (
                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255, 255, 255, 0.35)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "4px" }}>
                    Preview vragen (nog niet opgeslagen)
                  </div>
                  {generatedQuestions.map((q, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        background: "rgba(255, 255, 255, 0.04)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <span style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: q.type === "poll" ? "#f30349" : "#195969",
                        background: q.type === "poll" ? "rgba(243, 3, 73, 0.15)" : "rgba(25, 89, 105, 0.2)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}>
                        {q.type === "poll" ? "Poll" : "Open"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", lineHeight: 1.4 }}>
                          {q.question}
                        </div>
                        {q.options && (
                          <div style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: "0.72rem", marginTop: "4px" }}>
                            {q.options.join(" · ")}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setGeneratedQuestions(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "rgba(255, 255, 255, 0.2)",
                          fontSize: "1rem",
                          cursor: "pointer",
                          padding: "0 4px",
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {/* Confirm / Cancel buttons */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      onClick={handleConfirmQuestions}
                      disabled={isSavingQuestions}
                      style={{
                        flex: 1,
                        background: "rgba(25, 89, 105, 0.4)",
                        border: "1px solid rgba(25, 89, 105, 0.5)",
                        borderRadius: "8px",
                        padding: "10px",
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: isSavingQuestions ? "wait" : "pointer",
                        opacity: isSavingQuestions ? 0.6 : 1,
                      }}
                    >
                      {isSavingQuestions ? "Opslaan..." : "Bevestigen"}
                    </button>
                    <button
                      onClick={handleCancelQuestions}
                      disabled={isSavingQuestions}
                      style={{
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        padding: "10px",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}

              {/* Saved questions list - CONFIRMED */}
              {questionsConfirmed && savedQuestions.length > 0 && (
                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(25, 89, 105, 0.8)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                      ✓ Vragen opgeslagen
                    </div>
                    <button
                      onClick={handleCancelQuestions}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255, 255, 255, 0.3)",
                        fontSize: "0.65rem",
                        cursor: "pointer",
                      }}
                    >
                      Wissen
                    </button>
                  </div>
                  {savedQuestions.map((q) => (
                    <div
                      key={q.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        background: "rgba(25, 89, 105, 0.08)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        border: "1px solid rgba(25, 89, 105, 0.2)",
                      }}
                    >
                      <span style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: q.type === "poll" ? "#f30349" : "#195969",
                        background: q.type === "poll" ? "rgba(243, 3, 73, 0.15)" : "rgba(25, 89, 105, 0.2)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}>
                        {q.type === "poll" ? "Poll" : "Open"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.82rem", lineHeight: 1.4 }}>
                          {q.title}
                        </div>
                        {q.options && (
                          <div style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: "0.72rem", marginTop: "4px" }}>
                            {q.options.join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Glowing red connect button - NO GRADIENT */}
          {(() => {
            const startDisabled = isPreparing || (generatedQuestions.length > 0 && !questionsConfirmed);
            return (
              <button
                disabled={startDisabled}
                onClick={() => {
                  if (startDisabled) return;
                  handleConnect();
                }}
                style={{
                  background: startDisabled ? "rgba(243, 3, 73, 0.3)" : "#f30349",
                  color: startDisabled ? "rgba(255, 255, 255, 0.5)" : "white",
                  padding: "20px 56px",
                  borderRadius: "9999px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: startDisabled ? "not-allowed" : "pointer",
                  boxShadow: startDisabled
                    ? "0 0 20px rgba(243, 3, 73, 0.2)"
                    : "0 0 50px rgba(243, 3, 73, 0.6), 0 0 100px rgba(243, 3, 73, 0.3)",
                  transition: "all 0.3s ease",
                  opacity: startDisabled ? 0.6 : 1,
                  pointerEvents: startDisabled ? "none" : "auto",
                }}
                onMouseEnter={(e) => {
                  if (startDisabled) return;
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.boxShadow = "0 0 70px rgba(243, 3, 73, 0.8), 0 0 140px rgba(243, 3, 73, 0.4)";
                }}
                onMouseLeave={(e) => {
                  if (startDisabled) return;
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 0 50px rgba(243, 3, 73, 0.6), 0 0 100px rgba(243, 3, 73, 0.3)";
                }}
              >
                Start
              </button>
            );
          })()}

          {/* Error */}
          {error && (
            <div
              className="mt-8 px-6 py-3 rounded-full"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Demo controls top right */}
        <div className="absolute top-6 right-8 flex items-center gap-3 z-30">
          <button
            onClick={() => setShowQuestionMenu(prev => !prev)}
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "2px",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(255, 255, 255, 0.05)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
            }}
          >
            Live
          </button>
          <button
            onClick={() => setShowCheatSheet(prev => !prev)}
            style={{
              color: showCheatSheet ? "rgba(25, 89, 105, 0.9)" : "rgba(255, 255, 255, 0.5)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "2px",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: "16px",
              border: `1px solid ${showCheatSheet ? "rgba(25, 89, 105, 0.4)" : "rgba(255, 255, 255, 0.25)"}`,
              background: showCheatSheet ? "rgba(25, 89, 105, 0.1)" : "rgba(255, 255, 255, 0.05)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!showCheatSheet) {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              }
            }}
            onMouseLeave={(e) => {
              if (!showCheatSheet) {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
              }
            }}
          >
            Tips
          </button>
          <button
            onClick={() => setShowQrCode(true)}
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "2px",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(255, 255, 255, 0.05)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
            }}
          >
            QR Code
          </button>
        </div>

        {/* Poll Display - landing page */}
        {activeModal === "poll" && currentPoll && (
          <PollDisplay
            poll={currentPoll}
            onClose={() => setActiveModal("none")}
          />
        )}

        <style jsx global>{`
          @keyframes pulse-expand {
            0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.5; }
            100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
          }
          @keyframes ring-breathe {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.06); opacity: 1; }
          }
          @keyframes fadeInSetup {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes dotBlink {
            0%, 20% { opacity: 0; }
            40%, 100% { opacity: 1; }
          }
          @keyframes livePulse {
            0%, 100% { border-color: rgba(34, 197, 94, 0.25); }
            50% { border-color: rgba(34, 197, 94, 0.6); }
          }
          @keyframes liveBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>

      {/* Cheat Sheet Modal - shared, outside overflow-hidden */}
      {showCheatSheet && <CheatSheetModal onClose={() => setShowCheatSheet(false)} />}

      {/* QR Code Modal */}
      {showQrCode && (
        <div
          onClick={() => setShowQrCode(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(ellipse at 50% 40%, #0a0a14 0%, #000000 100%)",
            backdropFilter: "blur(16px)",
            animation: "fadeInSetup 0.25s ease",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#f30349",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            boxShadow: "0 0 30px rgba(243, 3, 73, 0.4)",
          }}>
            <span style={{ color: "white", fontSize: "1.5rem", fontWeight: 800 }}>N</span>
          </div>
          <div style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "white",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Scan om te stemmen
          </div>
          <div style={{
            width: 60,
            height: 3,
            borderRadius: 2,
            background: "#f30349",
            marginBottom: 40,
          }} />
          <div style={{
            background: "white",
            borderRadius: 24,
            padding: 32,
            border: "3px solid rgba(243, 3, 73, 0.4)",
            boxShadow: "0 0 80px rgba(243, 3, 73, 0.2), 0 30px 60px rgba(0, 0, 0, 0.7)",
          }}>
            <QRCodeSVG value={typeof window !== "undefined" ? window.location.origin + voteUrl : voteUrl} size={360} level="M" />
          </div>
          <div style={{ marginTop: 24, color: "rgba(255, 255, 255, 0.5)", fontSize: "0.95rem", fontFamily: "monospace", letterSpacing: "0.02em" }} onClick={(e) => e.stopPropagation()}>
            {typeof window !== "undefined" ? window.location.origin + voteUrl : voteUrl}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const el = e.currentTarget;
              const fullUrl = typeof window !== "undefined" ? window.location.origin + voteUrl : voteUrl;
              navigator.clipboard.writeText(fullUrl).then(() => {
                el.textContent = "Gekopieerd!";
                el.style.color = "#22c55e";
                el.style.borderColor = "rgba(34, 197, 94, 0.4)";
                setTimeout(() => {
                  el.textContent = "Kopieer link";
                  el.style.color = "rgba(255, 255, 255, 0.7)";
                  el.style.borderColor = "rgba(255, 255, 255, 0.15)";
                }, 1500);
              });
            }}
            style={{
              marginTop: 12,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.85rem",
              fontWeight: 500,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 10,
              padding: "8px 20px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Kopieer link
          </button>
          <div style={{
            marginTop: 48,
            color: "rgba(255, 255, 255, 0.25)",
            fontSize: "0.8rem",
            letterSpacing: "1px",
          }}>
            Klik ergens om te sluiten
          </div>
        </div>
      )}
    </>
    );
  }

  // Connecting loader
  if (isConnecting) {
    return (
      <div className="fixed inset-0 overflow-hidden" style={{ background: "#0a0a0a" }}>
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(25, 89, 105, 0.15) 0%, transparent 50%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Animated Nova */}
          <div className="relative mb-10">
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle, rgba(25, 89, 105, 0.4), rgba(25, 89, 105, 0.15))",
                animation: "loader-glow 1.8s ease-in-out infinite",
              }}
            >
              {/* Spinning ring */}
              <div
                className="absolute rounded-full border-4 border-transparent"
                style={{
                  inset: "-14px",
                  borderTopColor: "#195969",
                  borderRightColor: "#f30349",
                  animation: "spin 1.2s linear infinite",
                }}
              />
              <span
                style={{
                  fontSize: "3rem",
                  fontWeight: 900,
                  color: "#195969",
                }}
              >
                N
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 mb-5">
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#f30349",
                animation: "blink 1s ease-in-out infinite",
              }}
            />
            <span
              style={{
                color: "#195969",
                fontSize: "1.1rem",
                fontWeight: 600,
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              Verbinden
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "220px",
              height: "3px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: "9999px",
                background: "linear-gradient(90deg, #195969, #f30349)",
                animation: "progress-slide 1.8s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        <style jsx global>{`
          @keyframes loader-glow {
            0%, 100% { box-shadow: 0 0 50px rgba(25, 89, 105, 0.4); }
            50% { box-shadow: 0 0 80px rgba(25, 89, 105, 0.6); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
          @keyframes progress-slide {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 50%; margin-left: 25%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // Connected - Visualizer
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        opacity: showVisualizer ? 1 : 0,
        transition: "opacity 1s ease-out",
      }}
    >
      <NovaVisualizer audioLevel={novaAudioLevel} />

      {/* UI Overlay */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Header */}
        <header className="pointer-events-auto absolute top-0 left-0 right-0 z-20">
          <div className="flex items-center justify-between px-8 py-6">
            <span
              style={{
                color: "rgba(255, 255, 255, 0.35)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              Nova AI
            </span>

            <div className="flex items-center gap-3">
              {/* LIVE button — connection status indicator */}
              <button
                onClick={() => setShowQuestionMenu(prev => !prev)}
                style={{
                  color: isError ? "#f30349"
                    : isConnecting ? "#f59e0b"
                    : "#22c55e",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                  borderRadius: "16px",
                  border: `1px solid ${
                    isError ? "rgba(243, 3, 73, 0.5)"
                    : isConnecting ? "rgba(245, 158, 11, 0.4)"
                    : "rgba(34, 197, 94, 0.4)"}`,
                  background: isError ? "rgba(243, 3, 73, 0.1)"
                    : isConnecting ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(34, 197, 94, 0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  animation: isConnected ? "livePulse 2s ease-in-out infinite"
                    : isConnecting ? "liveBlink 1s ease-in-out infinite"
                    : "none",
                }}
              >
                {isError ? "Offline" : isConnecting ? "Connecting..." : "Live"}
              </button>

              <button
                  onClick={() => setShowQuestionMenu(prev => !prev)}
                  style={{
                    color: showQuestionMenu ? "rgba(25, 89, 105, 0.9)" : "rgba(255, 255, 255, 0.25)",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    padding: "8px 14px",
                    borderRadius: "16px",
                    border: `1px solid ${showQuestionMenu ? "rgba(25, 89, 105, 0.4)" : "rgba(255, 255, 255, 0.12)"}`,
                    background: showQuestionMenu ? "rgba(25, 89, 105, 0.1)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!showQuestionMenu) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showQuestionMenu) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.25)";
                    }
                  }}
                >
                  Stem / Vragen{firebaseQuestions.length > 0 ? ` (${firebaseQuestions.length})` : ""}
                  {activeQuestion !== null && (
                    <span style={{
                      position: "absolute",
                      top: "-3px",
                      right: "-3px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#f30349",
                      boxShadow: "0 0 6px rgba(243, 3, 73, 0.6)",
                    }} />
                  )}
                </button>

              <button
                onClick={() => { setShowCheatSheet(prev => !prev); setShowQuestionMenu(false); }}
                style={{
                  color: showCheatSheet ? "rgba(25, 89, 105, 0.9)" : "rgba(255, 255, 255, 0.25)",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                  borderRadius: "16px",
                  border: `1px solid ${showCheatSheet ? "rgba(25, 89, 105, 0.4)" : "rgba(255, 255, 255, 0.12)"}`,
                  background: showCheatSheet ? "rgba(25, 89, 105, 0.1)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!showCheatSheet) {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showCheatSheet) {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.25)";
                  }
                }}
              >
                Tips
              </button>

              <button
                onClick={handleDisconnect}
                style={{
                  color: "rgba(243, 3, 73, 0.5)",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(243, 3, 73, 0.25)",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(243, 3, 73, 0.4)";
                  e.currentTarget.style.color = "rgba(243, 3, 73, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(243, 3, 73, 0.25)";
                  e.currentTarget.style.color = "rgba(243, 3, 73, 0.5)";
                }}
              >
                Stop
              </button>
            </div>
          </div>
        </header>

        {/* Questions slide-out panel */}
        {showQuestionMenu && (
          <div
            className="pointer-events-auto"
            style={{
              position: "absolute",
              top: "64px",
              right: "16px",
              width: "340px",
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
              background: "rgba(10, 10, 12, 0.92)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "16px",
              zIndex: 50,
              animation: "fadeInSetup 0.2s ease",
            }}
          >
            {/* QR Code toggle button */}
            <button
              onClick={() => setShowQrCode(true)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "12px",
                borderRadius: "10px",
                border: "1px solid rgba(243, 3, 73, 0.3)",
                background: "rgba(243, 3, 73, 0.1)",
                color: "#f30349",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Toon QR Code
            </button>

            {/* Questions list */}
            {firebaseQuestions.length > 0 && (<>
            <div style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.3)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}>
              Vragen uit Firebase
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {firebaseQuestions.map((q) => {
                const isActive = q.active === true;
                return (
                  <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <button
                    onClick={() => isActive ? handleClearLiveQuestion() : handleSetQuestionLive(q.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: isActive ? "12px 14px" : "10px 12px",
                      borderRadius: "10px",
                      border: isActive
                        ? "2px solid #f30349"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                      background: isActive
                        ? "rgba(243, 3, 73, 0.15)"
                        : "rgba(255, 255, 255, 0.03)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      width: "100%",
                      boxShadow: isActive
                        ? "0 0 20px rgba(243, 3, 73, 0.3), 0 0 40px rgba(243, 3, 73, 0.15)"
                        : "none",
                    }}
                  >
                    {/* Type badge */}
                    <span style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: q.type === "poll" ? "#f30349" : "#195969",
                      background: q.type === "poll" ? "rgba(243, 3, 73, 0.15)" : "rgba(25, 89, 105, 0.2)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}>
                      {q.type === "poll" ? "Poll" : "Open"}
                    </span>

                    {/* Question text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: isActive ? "white" : "rgba(255, 255, 255, 0.7)",
                        fontSize: isActive ? "0.85rem" : "0.78rem",
                        fontWeight: isActive ? 600 : 400,
                        lineHeight: 1.4,
                      }}>
                        {q.title}
                      </div>
                      {q.options && (
                        <div style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "0.68rem", marginTop: "3px" }}>
                          {q.options.join(" · ")}
                        </div>
                      )}
                    </div>

                    {/* ACTIVE indicator - big and clear */}
                    {isActive && (
                      <span style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        color: "white",
                        background: "#f30349",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        flexShrink: 0,
                        boxShadow: "0 0 10px rgba(243, 3, 73, 0.5)",
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}>
                        ACTIEF
                      </span>
                    )}
                  </button>

                  {/* Knoppen voor actieve vraag */}
                  {isActive && (
                    <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openQuestionModal(false); }}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "white",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Toon Vraag
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openQuestionModal(true); }}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(243, 3, 73, 0.15)",
                          color: "white",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Toon Resultaten
                      </button>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
            </>)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2"
            style={{
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: "24px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Cheat Sheet Modal - outside pointer-events-none */}
      {showCheatSheet && <CheatSheetModal onClose={() => setShowCheatSheet(false)} />}

      {/* Fullscreen QR Code Modal */}
      {showQrCode && (
        <div
          onClick={() => setShowQrCode(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(ellipse at 50% 40%, #0a0a14 0%, #000000 100%)",
            backdropFilter: "blur(16px)",
            animation: "fadeInSetup 0.25s ease",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#f30349",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            boxShadow: "0 0 30px rgba(243, 3, 73, 0.4)",
          }}>
            <span style={{ color: "white", fontSize: "1.5rem", fontWeight: 800 }}>N</span>
          </div>
          <div style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "white",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Scan om te stemmen
          </div>
          <div style={{
            width: 60,
            height: 3,
            borderRadius: 2,
            background: "#f30349",
            marginBottom: 40,
          }} />
          <div style={{
            background: "white",
            borderRadius: 24,
            padding: 32,
            border: "3px solid rgba(243, 3, 73, 0.4)",
            boxShadow: "0 0 80px rgba(243, 3, 73, 0.2), 0 30px 60px rgba(0, 0, 0, 0.7)",
          }}>
            <QRCodeSVG value={typeof window !== "undefined" ? window.location.origin + voteUrl : voteUrl} size={360} level="M" />
          </div>
          <div style={{ marginTop: 24, color: "rgba(255, 255, 255, 0.5)", fontSize: "0.95rem", fontFamily: "monospace", letterSpacing: "0.02em" }} onClick={(e) => e.stopPropagation()}>
            {typeof window !== "undefined" ? window.location.origin + voteUrl : voteUrl}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const el = e.currentTarget;
              const fullUrl = typeof window !== "undefined" ? window.location.origin + voteUrl : voteUrl;
              navigator.clipboard.writeText(fullUrl).then(() => {
                el.textContent = "Gekopieerd!";
                el.style.color = "#22c55e";
                el.style.borderColor = "rgba(34, 197, 94, 0.4)";
                setTimeout(() => {
                  el.textContent = "Kopieer link";
                  el.style.color = "rgba(255, 255, 255, 0.7)";
                  el.style.borderColor = "rgba(255, 255, 255, 0.15)";
                }, 1500);
              });
            }}
            style={{
              marginTop: 12,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.85rem",
              fontWeight: 500,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 10,
              padding: "8px 20px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Kopieer link
          </button>
          <div style={{
            marginTop: 48,
            color: "rgba(255, 255, 255, 0.25)",
            fontSize: "0.8rem",
          }}>
            Klik om te sluiten
          </div>
        </div>
      )}

      {/* Poll Display - only show when activeModal is poll */}
      {activeModal === "poll" && currentPoll && (
        <PollDisplay
          poll={currentPoll}
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Function call loader (top-right) - show when thinking but NOT when search/image specific loaders are shown */}
      {isThinking && thinkingMessage && !searchSearching && !imageGenerating && (
        <div
          style={{
            position: "fixed",
            top: "32px",
            right: "32px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "20px 32px",
            borderRadius: "18px",
            background: "rgba(10, 10, 10, 0.95)",
            border: "2px solid rgba(25, 89, 105, 0.4)",
            boxShadow: "0 0 60px rgba(25, 89, 105, 0.15), 0 8px 32px rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(25, 89, 105, 0.15)",
              border: "2px solid rgba(25, 89, 105, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#195969",
                boxShadow: "0 0 12px #195969",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <div style={{ color: "white", fontSize: "1.15rem", fontWeight: 700 }}>
            {thinkingMessage}
          </div>
        </div>
      )}

      {/* Open Vraag Display - only show when activeModal is openvraag */}
      {activeModal === "openvraag" && openVraag && (
        <OpenVraagDisplay
          openVraag={openVraag}
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Poll Deep Dive Regions */}
      {activeModal === "polldeep-regions" && pollDeepDive && currentPoll && (
        <PollDeepDiveDisplay
          data={pollDeepDive}
          question={currentPoll.question}
          mode="regions"
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Poll Deep Dive Profiles */}
      {activeModal === "polldeep-profiles" && pollDeepDive && currentPoll && (
        <PollDeepDiveDisplay
          data={pollDeepDive}
          question={currentPoll.question}
          mode="profiles"
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Open Vraag Deep Dive */}
      {activeModal === "openvraagdeep" && openVraagDeepDive && (
        <OpenVraagDeepDiveDisplay
          data={openVraagDeepDive}
          question={openVraagDeepQuestion}
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Nova Summary */}
      {activeModal === "summary" && novaSummary && (
        <NovaSummaryDisplay
          data={novaSummary}
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Seat Allocation */}
      {activeModal === "seats" && seatAllocation && (
        <SeatAllocationDisplay
          data={seatAllocation}
          onClose={() => setActiveModal("none")}
        />
      )}

      {/* Nova Image */}
      {activeModal === "image" && novaImage && (
        <NovaImageDisplay
          data={novaImage}
          onClose={() => {
            setActiveModal("none");
            setNovaImage(null);
          }}
        />
      )}

      {/* Top-left notification stack */}
      <div
        style={{
          position: "fixed",
          top: "32px",
          left: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          zIndex: 9999,
        }}
      >
        {imageGenerating && (
          <div
            key="img-gen"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "20px 32px",
              borderRadius: "18px",
              background: "rgba(10, 10, 10, 0.95)",
              border: "2px solid rgba(243, 3, 73, 0.4)",
              boxShadow: "0 0 60px rgba(243, 3, 73, 0.15), 0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(243, 3, 73, 0.15)",
                border: "2px solid rgba(243, 3, 73, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: "#f30349",
                  boxShadow: "0 0 12px #f30349",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
            <div>
              <div style={{ color: "white", fontSize: "1.15rem", fontWeight: 700 }}>
                Image wordt gegenereerd
              </div>
              <div style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.9rem", marginTop: "4px" }}>
                Even geduld, dit kan 10-20 seconden duren...
              </div>
            </div>
          </div>
        )}
        {searchSearching && (
          <div
            key="search-gen"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "20px 32px",
              borderRadius: "18px",
              background: "rgba(10, 10, 10, 0.95)",
              border: "2px solid rgba(25, 89, 105, 0.4)",
              boxShadow: "0 0 60px rgba(25, 89, 105, 0.15), 0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(25, 89, 105, 0.15)",
                border: "2px solid rgba(25, 89, 105, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: "#195969",
                  boxShadow: "0 0 12px #195969",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
            <div>
              <div style={{ color: "white", fontSize: "1.15rem", fontWeight: 700 }}>
                Zoeken op internet
              </div>
              <div style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.9rem", marginTop: "4px" }}>
                Even geduld...
              </div>
            </div>
          </div>
        )}
        {imagePending && !imageGenerating && activeModal !== "image" && (
          <div
            key="img-ready"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "20px 32px",
              borderRadius: "18px",
              background: "rgba(10, 10, 10, 0.95)",
              border: "2px solid rgba(243, 3, 73, 0.6)",
              boxShadow: "0 0 60px rgba(243, 3, 73, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5)",
              animation: "imageReadyPulse 2s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f30349",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                fontWeight: 900,
                color: "white",
                boxShadow: "0 0 25px rgba(243, 3, 73, 0.6)",
              }}
            >
              N
            </div>
            <div>
              <div style={{ color: "white", fontSize: "1.2rem", fontWeight: 700 }}>
                Image is klaar!
              </div>
              <div style={{ color: "rgba(255, 255, 255, 0.55)", fontSize: "0.9rem", marginTop: "4px" }}>
                Vraag Nova om het te laten zien
              </div>
            </div>
          </div>
        )}
        {searchPending && !searchSearching && (
          <div
            key="search-ready"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "20px 32px",
              borderRadius: "18px",
              background: "rgba(10, 10, 10, 0.95)",
              border: "2px solid rgba(25, 89, 105, 0.6)",
              boxShadow: "0 0 60px rgba(25, 89, 105, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5)",
              animation: "searchReadyPulse 2s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#195969",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                fontWeight: 900,
                color: "white",
                boxShadow: "0 0 25px rgba(25, 89, 105, 0.6)",
              }}
            >
              N
            </div>
            <div>
              <div style={{ color: "white", fontSize: "1.2rem", fontWeight: 700 }}>
                Zoekresultaten binnen!
              </div>
              <div style={{ color: "rgba(255, 255, 255, 0.55)", fontSize: "0.9rem", marginTop: "4px" }}>
                Vraag Nova om ze te laten zien
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes imageReadyPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(243, 3, 73, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5); }
          50% { box-shadow: 0 0 80px rgba(243, 3, 73, 0.4), 0 8px 32px rgba(0, 0, 0, 0.5); }
        }
        @keyframes searchReadyPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(25, 89, 105, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5); }
          50% { box-shadow: 0 0 80px rgba(25, 89, 105, 0.4), 0 8px 32px rgba(0, 0, 0, 0.5); }
        }
        @keyframes livePulse {
          0%, 100% { border-color: rgba(34, 197, 94, 0.25); }
          50% { border-color: rgba(34, 197, 94, 0.6); }
        }
        @keyframes liveBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
