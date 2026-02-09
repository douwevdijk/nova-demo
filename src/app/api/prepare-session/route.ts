import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      );
    }

    const { topic, audience, tone, notes, questionCount, questionType } =
      await request.json();

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 },
      );
    }

    const audienceLabel = audience || "niet opgegeven";
    const toneLabel = tone || "niet opgegeven";
    const qCount = questionCount || 3;
    const qType = questionType || "mix";

    const typeInstruction =
      qType === "poll"
        ? "Maak ALLEEN multiple choice vragen met 3-4 antwoordopties per vraag."
        : qType === "open"
          ? "Maak ALLEEN open vragen (geen antwoordopties)."
          : "Maak een mix van multiple choice vragen (met 3-4 antwoordopties) en open vragen.";

    const prompt = `Je bent een AI-assistent die live evenementen voorbereidt. Je krijgt ruwe input van een gebruiker en moet dit omzetten naar twee dingen:

1. Een SESSIE BRIEFING: een gestructureerd, beknopt overzicht dat gebruikt wordt als context voor een AI-spraakassistent (Nova) tijdens een live presentatie.
2. VRAGEN: ${qCount} interactieve vragen voor het publiek.

═══════════════════════════════════════════
RUWE INPUT VAN DE GEBRUIKER:
═══════════════════════════════════════════
Onderwerp: ${topic}
Publiek: ${audienceLabel}
Gewenste toon: ${toneLabel}
${notes ? `Extra notities: ${notes}` : "Geen extra notities."}

═══════════════════════════════════════════
INSTRUCTIES VOOR DE BRIEFING:
═══════════════════════════════════════════
- Maak een korte, gestructureerde briefing (max 150 woorden)
- Gebruik dit format:
  Onderwerp: [helder geformuleerd onderwerp]
  Doelgroep: [beschrijving publiek]
  Toon: [gewenste communicatiestijl]
  Kernthema's: [3-5 relevante thema's/invalshoeken]
  Focus: [waar moet Nova op letten / wat is belangrijk]
- Als de input onzinnig of onduidelijk is, maak er het beste van en noteer wat onduidelijk was
- ALTIJD in het Nederlands

═══════════════════════════════════════════
INSTRUCTIES VOOR DE VRAGEN:
═══════════════════════════════════════════
${typeInstruction}
- Maak de vragen prikkelend en relevant voor het onderwerp en publiek
- Multiple choice opties moeten kort en krachtig zijn
- Open vragen moeten uitnodigen tot korte, krachtige antwoorden
- Alle vragen in het Nederlands

═══════════════════════════════════════════
SEED ANTWOORDEN - CRUCIAAL VOOR DE DEMO!
═══════════════════════════════════════════

⚠️ LEES DIT ZEER ZORGVULDIG - DE SEED ANTWOORDEN MOETEN 100% PASSEN BIJ DE VRAAG!

Voor POLL vragen:
- "seedVotes": verdeling van stemmen over de opties (totaal 15-25 stemmen, NIET gelijk verdeeld)

Voor OPEN vragen - HIER GAAT HET VAAK FOUT:
- "seedAnswers": 10-12 antwoorden die LETTERLIJK antwoord geven op de gestelde vraag
- Stel jezelf de vraag: "Als iemand deze vraag stelt, wat zou een persoon antwoorden?"

CONCRETE VOORBEELDEN:

Vraag: "Wat is je grootste uitdaging met AI?"
seedAnswers: ["Te weinig kennis in het team", "Privacy en security", "Weerstand van collega's", "Geen budget", "Weet niet waar te beginnen", "Data kwaliteit", "Angst voor baanverlies", "Te veel hype", "Integratie met bestaande systemen", "Management snapt het niet"]

Vraag: "Welk dier zou je organisatie zijn?"
seedAnswers: ["Een schildpad - traag maar gestaag", "Mieren - hard werken", "Kameel - overleven in de woestijn", "Octopus - flexibel", "Bij - teamwork", "Slak", "Dinosaurus helaas", "Kameleon - aanpassen", "Eekhoorn - hamsteren", "Uil - wijs maar langzaam"]

Vraag: "Waar denk je aan bij innovatie?"
seedAnswers: ["Nieuwe technologie", "Risico nemen", "Out of the box denken", "Startups", "Verandering", "Toekomst", "AI", "Experimenteren", "Samenwerken", "Disruptie", "Creativiteit"]

⚠️ FOUTE ANTWOORDEN (NOOIT GEBRUIKEN):
- "Ja", "Nee", "Misschien", "Goed idee", "Interessant", "Eens", "Oneens", "Weet niet"
- Deze zijn GENERIEK en passen NIET als antwoord op een open vraag!

═══════════════════════════════════════════
ANTWOORD VERPLICHT IN DIT EXACTE JSON FORMAT (geen markdown, geen backticks, puur JSON):
{
  "briefing": "De sessie briefing tekst hier...",
  "questions": [
    {
      "type": "poll",
      "question": "De poll vraag?",
      "options": ["Optie A", "Optie B", "Optie C"],
      "seedVotes": [
        {"option": "Optie A", "count": 12},
        {"option": "Optie B", "count": 8},
        {"option": "Optie C", "count": 5}
      ]
    },
    {
      "type": "open",
      "question": "De open vraag?",
      "seedAnswers": ["Specifiek antwoord 1 op de vraag", "Specifiek antwoord 2", "Specifiek antwoord 3", "etc - 10-12 totaal"]
    }
  ]
}`;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text || "";

    // Parse JSON from response (strip any markdown backticks if present)
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      briefing: result.briefing,
      questions: result.questions || [],
    });
  } catch (error) {
    console.error("Session preparation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Session preparation failed",
      },
      { status: 500 },
    );
  }
}
