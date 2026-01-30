import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Step 1: Use GPT-4o with web search to get raw data
    const searchResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search" }],
        input: query,
      }),
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error("Web search error:", error);

      return NextResponse.json({
        result: `Ik kon geen actuele informatie vinden over "${query}".`,
        query,
        source: "fallback"
      });
    }

    const searchData = await searchResponse.json();

    // Extract raw search result
    let rawResult = "";
    if (searchData.output) {
      for (const item of searchData.output) {
        if (item.type === "message" && item.content) {
          for (const content of item.content) {
            if (content.type === "output_text") {
              rawResult += content.text;
            }
          }
        }
      }
    }

    if (!rawResult) {
      return NextResponse.json({
        result: "Geen resultaten gevonden.",
        query,
        source: "web_search"
      });
    }

    // Step 2: Summarize with GPT-4o for presentation
    const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Je bent een AI-assistent voor live presentaties. Vat de gegeven informatie samen in MAXIMAAL 5 korte, pakkende zinnen.

Regels:
- Wees concreet en informatief
- Geen bullet points, gewoon vloeiende tekst
- Geen inleidingen zoals "Hier is een samenvatting"
- Begin direct met de kernpunten
- Schrijf in het Nederlands
- Houd het presentatie-waardig en professioneel`
          },
          {
            role: "user",
            content: `Vraag: ${query}\n\nInformatie:\n${rawResult}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!summaryResponse.ok) {
      // Fallback to raw result if summarization fails
      console.error("Summarization failed, using raw result");
      return NextResponse.json({
        result: rawResult.slice(0, 500),
        query,
        source: "web_search"
      });
    }

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices?.[0]?.message?.content || rawResult.slice(0, 500);

    return NextResponse.json({
      result: summary,
      query,
      source: "web_search_summarized"
    });

  } catch (error) {
    console.error("Web search error:", error);
    return NextResponse.json(
      { error: "Web search failed", result: "Er ging iets mis bij het zoeken." },
      { status: 500 }
    );
  }
}
