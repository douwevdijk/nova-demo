"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, BarController);

const BAR_COLORS = [
  { bg: "#1e7d91", glow: "rgba(25, 89, 105, 0.6)",  gradFrom: "#12505e", gradTo: "#2bb5d4" },
  { bg: "#f30349", glow: "rgba(243, 3, 73, 0.6)",    gradFrom: "#a8022f", gradTo: "#ff4f7f" },
  { bg: "#9333ea", glow: "rgba(147, 51, 234, 0.6)",  gradFrom: "#6b21a8", gradTo: "#c084fc" },
  { bg: "#f59e0b", glow: "rgba(245, 158, 11, 0.6)",  gradFrom: "#b45309", gradTo: "#fcd34d" },
  { bg: "#10b981", glow: "rgba(16, 185, 129, 0.6)",  gradFrom: "#047857", gradTo: "#6ee7b7" },
];

// Plugin: gradient fills + glow on all bars
const gradientGlowPlugin = {
  id: "gradientGlow",
  beforeDatasetsDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const ds = chart.data.datasets[0];
    const dataArr = ds.data as number[];

    const gradients = BAR_COLORS.map((c) => {
      const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      g.addColorStop(0, c.gradFrom);
      g.addColorStop(1, c.gradTo);
      return g;
    });

    ds.backgroundColor = Array.from(
      { length: dataArr.length },
      (_, i) => gradients[i % gradients.length]
    );

    const meta = chart.getDatasetMeta(0);
    if (!meta?.data) return;

    meta.data.forEach((bar, i) => {
      const el = bar as unknown as {
        draw: (ctx: CanvasRenderingContext2D) => void;
      };
      const originalDraw = el.draw.bind(bar);
      const color = BAR_COLORS[i % BAR_COLORS.length];

      el.draw = function (drawCtx: CanvasRenderingContext2D) {
        drawCtx.save();
        drawCtx.shadowColor = color.glow;
        drawCtx.shadowBlur = 25;
        originalDraw(drawCtx);
        drawCtx.restore();
      };
    });
  },
};

// Plugin: percentage labels above bars
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
      ctx.fillText(`${Math.round(value)}%`, bar.x, bar.y - 14);
    });

    ctx.restore();
  },
};

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

const MOCK_OPTIONS = [
  "Elke dag meerdere keren",
  "Een paar keer per week",
  "Af en toe, als het uitkomt",
  "Zelden of bijna nooit",
  "Ik heb het nog nooit geprobeerd",
];

function randomPercentages(count: number): number[] {
  const raw = Array.from({ length: count }, () => Math.random() * 80 + 5);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.round((v / total) * 100));
}

export default function TestChartPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [data, setData] = useState([35, 25, 20, 12, 8]);
  const [totalVotes, setTotalVotes] = useState(47);

  // Create chart once on mount
  useEffect(() => {
    if (!canvasRef.current || chartRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const labels = MOCK_OPTIONS.map((o) => splitLabel(o));
    const initialData = [35, 25, 20, 12, 8];
    const maxVal = Math.max(...initialData, 10);

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: initialData,
            backgroundColor: BAR_COLORS.slice(0, initialData.length).map((c) => c.bg),
            borderRadius: { topLeft: 14, topRight: 14, bottomLeft: 4, bottomRight: 4 },
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1400, easing: "easeOutQuart" },
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
              color: "rgba(255, 255, 255, 0.85)",
              font: { size: 22, weight: "bold" as const },
              maxRotation: 0,
              minRotation: 0,
              padding: 20,
            },
          },
          y: {
            display: false,
            beginAtZero: true,
            max: Math.min(maxVal + 15, 100),
          },
        },
      },
      plugins: [gradientGlowPlugin, percentageLabelPlugin],
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  const handleRandomize = () => {
    const newData = randomPercentages(5);
    setData(newData);
    setTotalVotes((v) => v + Math.floor(Math.random() * 15) + 3);

    if (chartRef.current) {
      chartRef.current.data.datasets[0].data = newData;
      const maxVal = Math.max(...newData, 10);
      (chartRef.current.options.scales!.y as { max: number }).max = Math.min(
        maxVal + 15,
        100
      );
      chartRef.current.update("active");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse at 50% 40%, #0a0a14 0%, #000000 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "48px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Controls + Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
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
        <button
          onClick={handleRandomize}
          style={{
            background: "#195969",
            color: "white",
            padding: "10px 24px",
            borderRadius: "9999px",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 30px rgba(25, 89, 105, 0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.03)";
            e.currentTarget.style.boxShadow =
              "0 0 50px rgba(25, 89, 105, 0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow =
              "0 0 30px rgba(25, 89, 105, 0.5)";
          }}
        >
          Randomize
        </button>
        <span
          style={{
            color: "#195969",
            fontSize: "1.8rem",
            fontWeight: 700,
          }}
        >
          {totalVotes} stemmen
        </span>
      </div>

      {/* Question */}
      <h2
        style={{
          color: "white",
          fontSize: "2.6rem",
          fontWeight: 700,
          marginBottom: "24px",
          lineHeight: 1.25,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        Hoe vaak gebruik je AI in je dagelijkse werk?
      </h2>

      {/* Chart — fills remaining space */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
