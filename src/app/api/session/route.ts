import { NextRequest, NextResponse } from "next/server";
import { NOVA_SYSTEM_PROMPT, NOVA_VOICE, NOVA_TOOLS } from "@/lib/nova-persona";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Parse optional context (briefing from Gemini)
    let context = "";
    try {
      const body = await request.json();
      context = body.context || "";
    } catch {
      // No body is fine - context is optional
    }

    // Build instructions with optional context
    let instructions = NOVA_SYSTEM_PROMPT;
    if (context) {
      instructions += `\n\n# Sessie Context
${context}

Gebruik deze context om je antwoorden, vragen en analyses relevant te maken voor dit onderwerp. Als Rens vragen stelt of polls wil starten, baseer je suggesties op deze context.`;
    }

    // Create ephemeral client secret for WebRTC connection (GA API)
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions,
          audio: {
            input: {
              // Input audio transcription (moved from top-level in GA)
              transcription: {
                model: "whisper-1",
              },
              // Noise reduction for cleaner audio input
              noise_reduction: {
                type: "near_field",
              },
              // Use semantic VAD for smarter turn detection
              turn_detection: {
                type: "semantic_vad",
              },
            },
            output: {
              voice: NOVA_VOICE,
            },
          },
          // Function calling tools
          tools: NOVA_TOOLS,
          tool_choice: "auto",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", response.status, error);
      return NextResponse.json(
        { error: `Failed to create session: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // GA API returns { value: "ek_...", expires_at: ... } directly
    return NextResponse.json({
      client_secret: { value: data.value },
      session_id: data.id,
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
