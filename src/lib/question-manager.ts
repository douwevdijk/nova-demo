// Centrale QuestionManager - beheert alle vraag-gerelateerde logica
// Zowel Nova als de UI gebruiken deze manager

import {
  createQuestion,
  setQuestionActive,
  addSeedVotes,
  addSeedAnswers,
  PreparedQuestion,
} from "./firebase";

// Types voor vraag data
export interface QuestionDisplayData {
  id: string;
  type: "poll" | "open";
  title: string;
  options?: string[];
}

export interface PollResultItem {
  option: string;
  votes: number;
  percentage: number;
}

export interface OpenAnswer {
  text: string;
  count: number;
  name?: string;
}

export interface ActiveQuestionData {
  question: PreparedQuestion;
  // Voor polls: vote counts per option
  votes?: { option: string; count: number }[];
  // Voor open: alle antwoorden
  answers?: { text: string; name?: string }[];
}

export interface QuestionManagerConfig {
  campaignId: string;
  // Getters - halen actuele data uit React state
  getActiveQuestion: () => ActiveQuestionData | null;
  getAllQuestions: () => PreparedQuestion[];
  // Callbacks - naar React UI (gebruiken activeQuestion uit state)
  onShowQuestion: () => void;
  onShowResults: () => void;
}

export class QuestionManager {
  private config: QuestionManagerConfig;

  constructor(config: QuestionManagerConfig) {
    this.config = config;
  }

  get campaignId(): string {
    return this.config.campaignId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VRAAG AANMAKEN - voor als Nova zelf een vraag bedenkt
  // ═══════════════════════════════════════════════════════════════════════════

  async createPollQuestion(data: {
    title: string;
    options: string[];
    seedVotes?: { option: string; count: number }[];
  }): Promise<string> {
    const questionId = `poll_${Date.now()}`;

    // 1. Maak vraag aan in Firebase
    await createQuestion(this.campaignId, questionId, {
      title: data.title,
      type: "multi",
      options: data.options,
    });

    // 2. Voeg seed votes toe als meegegeven
    if (data.seedVotes) {
      await addSeedVotes(this.campaignId, questionId, data.seedVotes, data.options);
    }

    console.log("[QuestionManager] Created poll question:", questionId);
    return questionId;
  }

  async createOpenQuestion(data: {
    title: string;
    seedAnswers?: string[];
  }): Promise<string> {
    const questionId = `open_${Date.now()}`;

    // 1. Maak vraag aan in Firebase
    await createQuestion(this.campaignId, questionId, {
      title: data.title,
      type: "open",
      maxLength: 150,
    });

    // 2. Voeg seed answers toe als meegegeven
    if (data.seedAnswers) {
      await addSeedAnswers(this.campaignId, questionId, data.seedAnswers);
    }

    console.log("[QuestionManager] Created open question:", questionId);
    return questionId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VRAAG LIVE ZETTEN - centrale functie, vraag MOET al bestaan in Firebase
  // ═══════════════════════════════════════════════════════════════════════════

  async setQuestionLive(questionId: string): Promise<void> {
    // Zet active: true in Firebase (en deactiveer alle andere vragen)
    await setQuestionActive(this.campaignId, questionId);
    console.log("[QuestionManager] Set question live:", questionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VRAAG TONEN - alleen de vraag + opties, ZONDER resultaten
  // ═══════════════════════════════════════════════════════════════════════════

  showQuestion(): { success: boolean; message: string } {
    const activeData = this.config.getActiveQuestion();

    if (!activeData) {
      return { success: false, message: "Geen actieve vraag gevonden" };
    }

    this.config.onShowQuestion();
    return {
      success: true,
      message: `Vraag "${activeData.question.title}" wordt getoond`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTATEN TONEN - vraag + resultaten (uit Firebase listener)
  // ═══════════════════════════════════════════════════════════════════════════

  showResults(): { success: boolean; message: string } {
    const activeData = this.config.getActiveQuestion();

    if (!activeData) {
      return { success: false, message: "Geen actieve vraag gevonden" };
    }

    this.config.onShowResults();

    // Bouw samenvatting voor Nova
    let summary = "";
    if (activeData.question.type === "poll" && activeData.votes) {
      const totalVotes = activeData.votes.reduce((sum, v) => sum + v.count, 0);
      const winner = activeData.votes[0];
      const winnerPercentage = totalVotes > 0 ? Math.round((winner.count / totalVotes) * 100) : 0;
      summary = `${totalVotes} stemmen. Winnaar: "${winner?.option}" met ${winnerPercentage}%`;
    } else if (activeData.question.type === "open" && activeData.answers) {
      summary = `${activeData.answers.length} antwoorden ontvangen`;
    }

    return {
      success: true,
      message: `Resultaten voor "${activeData.question.title}": ${summary}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO GETTERS - voor Nova om info te krijgen zonder iets te tonen
  // ═══════════════════════════════════════════════════════════════════════════

  getActiveQuestionInfo(): { hasActiveQuestion: boolean; question?: PreparedQuestion; voteCount?: number; answerCount?: number } {
    const activeData = this.config.getActiveQuestion();

    if (!activeData) {
      return { hasActiveQuestion: false };
    }

    return {
      hasActiveQuestion: true,
      question: activeData.question,
      voteCount: activeData.votes?.reduce((sum, v) => sum + v.count, 0),
      answerCount: activeData.answers?.length,
    };
  }

  // Get active question with full results (for executeGetPollResults / executeGetWordCloudResults)
  getActiveQuestionWithResults(): {
    question: PreparedQuestion;
    votes?: { option: string; count: number }[];
    answers?: { text: string; name?: string }[];
  } | null {
    return this.config.getActiveQuestion();
  }

  getAllQuestionsInfo(): PreparedQuestion[] {
    return this.config.getAllQuestions();
  }
}
