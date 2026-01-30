import { NextResponse } from "next/server";

// In-memory store for demo (in production, use a database)
let currentPoll: {
  question: string;
  options: string[];
  startedAt: Date;
} | null = null;

export async function POST(request: Request) {
  try {
    const { question, options } = await request.json();

    if (!question || !options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: "Question and options are required" },
        { status: 400 }
      );
    }

    // Store the poll
    currentPoll = {
      question,
      options,
      startedAt: new Date(),
    };

    console.log("Poll started:", currentPoll);

    return NextResponse.json({
      success: true,
      message: `Poll "${question}" is gestart met ${options.length} opties`,
      poll: {
        question,
        options,
        participantCount: 0,
      }
    });

  } catch (error) {
    console.error("Poll start error:", error);
    return NextResponse.json(
      { error: "Failed to start poll" },
      { status: 500 }
    );
  }
}

// Export for other routes to access
export { currentPoll };
