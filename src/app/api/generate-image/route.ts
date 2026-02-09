import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const MODEL_NAME = "gemini-3-pro-image-preview";

// Allow up to 60 seconds for image generation
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

    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    console.log("Generating image with prompt:", prompt.substring(0, 100));
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    console.log("Gemini response received");

    // Extract image from response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 },
      );
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: "No content in response" },
        { status: 500 },
      );
    }

    let imageUrl = "";
    let textResponse = "";

    let rawBase64Data = "";
    for (const part of parts) {
      if (part.inlineData) {
        rawBase64Data = part.inlineData.data || "";
      }
      if (part.text) {
        textResponse = part.text;
      }
    }

    if (rawBase64Data) {
      const inputBuffer = Buffer.from(rawBase64Data, "base64");
      const compressedBuffer = await sharp(inputBuffer)
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      imageUrl = `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Model did not return an image", text: textResponse },
        { status: 500 },
      );
    }

    return NextResponse.json({ imageUrl, text: textResponse });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      { status: 500 },
    );
  }
}
