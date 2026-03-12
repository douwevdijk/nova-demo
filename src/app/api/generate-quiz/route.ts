import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not set");
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      );
    }

    const { topic, numQuestions } = await request.json();
    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 },
      );
    }

    const count = numQuestions || 6;

    console.log("Generating quiz for topic:", topic, "questions:", count);
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Je bent een Nederlandse quizmaster. Genereer ${count} quizvragen over het onderwerp: "${topic}".

Regels:
- Alle vragen zijn OPEN vragen (geen meerkeuzevragen)
- Het antwoord moet kort en feitelijk zijn (1-5 woorden)
- Varieer in moeilijkheid
- Maak de vragen interessant en leuk
- Voeg per vraag een "background" toe: 1-2 zinnen met een leuk feitje of context over het antwoord

Antwoord ALLEEN met valid JSON in dit formaat (geen extra tekst):
{
  "questions": [
    {
      "text": "De quizvraag",
      "answer": "Het korte antwoord",
      "background": "Een leuk feitje of achtergrondinformatie over het antwoord"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text || "";
    console.log("Gemini quiz response received, length:", text.length);

    // Strip markdown backticks if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "Invalid response format from model" },
        { status: 500 },
      );
    }

    return NextResponse.json({ questions: parsed.questions });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Quiz generation failed",
      },
      { status: 500 },
    );
  }
}
