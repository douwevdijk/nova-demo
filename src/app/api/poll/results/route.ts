import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { question, options } = await request.json();

    if (!question || !options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: "Poll data required" },
        { status: 400 }
      );
    }

    // Generate realistic demo results
    const totalVotes = Math.floor(Math.random() * 150) + 50; // 50-200 votes

    // Generate random votes for each option
    const votes: number[] = [];
    let remaining = totalVotes;

    for (let i = 0; i < options.length - 1; i++) {
      const maxVotes = Math.floor(remaining * 0.6);
      const vote = Math.floor(Math.random() * maxVotes) + 1;
      votes.push(vote);
      remaining -= vote;
    }
    votes.push(remaining); // Last option gets the rest

    // Shuffle to make it more random
    votes.sort(() => Math.random() - 0.5);

    // Build results
    const results = options.map((option: string, index: number) => ({
      option,
      votes: votes[index],
      percentage: Math.round((votes[index] / totalVotes) * 100),
    }));

    // Sort by votes descending
    results.sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes);

    console.log("Poll results generated:", { question, results, totalVotes });

    // Build readable summary for AI
    const resultsSummary = results
      .map((r: { option: string; votes: number; percentage: number }) =>
        `"${r.option}": ${r.votes} stemmen (${r.percentage}%)`
      )
      .join(", ");

    const winner = results[0];

    return NextResponse.json({
      success: true,
      question,
      results,
      totalVotes,
      winner: winner.option,
      winnerPercentage: winner.percentage,
      summary: resultsSummary,
      message: `Poll "${question}" - ${totalVotes} stemmen. Winnaar: "${winner.option}" met ${winner.percentage}%. Alle resultaten: ${resultsSummary}`,
    });

  } catch (error) {
    console.error("Poll results error:", error);
    return NextResponse.json(
      { error: "Failed to get poll results" },
      { status: 500 }
    );
  }
}
