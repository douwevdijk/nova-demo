import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      );
    }

    const { context, count, type } = await request.json();
    if (!context) {
      return NextResponse.json(
        { error: "Context is required" },
        { status: 400 },
      );
    }

    const questionCount = count || 3;
    const questionType = type || "mix"; // "poll", "open", "mix"

    const typeInstruction =
      questionType === "poll"
        ? "Maak ALLEEN multiple choice vragen met 3-4 antwoordopties per vraag."
        : questionType === "open"
        ? "Maak ALLEEN open vragen (geen antwoordopties)."
        : "Maak een mix van multiple choice vragen (met 3-4 antwoordopties) en open vragen.";

    const prompt = `Je bent een interactie-expert voor live events. Genereer ${questionCount} vragen voor een interactieve sessie met een publiek.

CONTEXT VAN DE SESSIE:
${context}

INSTRUCTIES:
${typeInstruction}
- Maak de vragen prikkelend en relevant voor het onderwerp
- Multiple choice opties moeten kort en krachtig zijn
- Open vragen moeten uitnodigen tot korte, krachtige antwoorden
- Alle vragen in het Nederlands

ANTWOORD VERPLICHT IN DIT EXACTE JSON FORMAT (geen markdown, geen backticks, puur JSON):
[
  {
    "type": "poll",
    "question": "De vraag?",
    "options": ["Optie A", "Optie B", "Optie C"]
  },
  {
    "type": "open",
    "question": "De open vraag?"
  }
]`;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text || "";

    // Parse JSON from response (strip any markdown backticks if present)
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const questions = JSON.parse(jsonStr);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Question generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Question generation failed",
      },
      { status: 500 },
    );
  }
}
