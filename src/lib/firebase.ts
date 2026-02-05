// Firebase configuration for Nova Vote
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, get, onValue, off, serverTimestamp, remove, push, update } from "firebase/database";

// Firebase config - using the existing me-do project
const firebaseConfig = {
  apiKey: "AIzaSyB9L73dyPoocEJ1_ApEmLuc5tjwixffwKc",
  authDomain: "me-do.firebaseapp.com",
  databaseURL: "https://me-do.firebaseio.com",
  projectId: "firebase-me-do",
  storageBucket: "firebase-me-do.appspot.com",
  messagingSenderId: "1012066892690",
  appId: "1:1012066892690:web:e63e369e7ad96d296edf4b",
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Default settings for campaigns
export const DEFAULT_CAMPAIGN_SETTINGS = {
  logoURL: null,
  bgColorFrom: "#0f172a",
  bgColorVia: "#581c87",
  bgColorTo: "#312e81",
  showDescription: true,
  showEmail: false,
  showCompany: false,
  loginTitle: "Welkom!",
  loginDescription: "Voordat je begint met stemmen, stel jezelf kort voor.",
};

// Generate unique campaign ID
export function generateCampaignId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `nova_${timestamp}_${random}`;
}

// Create a new campaign in Firebase
export async function createCampaign(campaignId: string): Promise<void> {
  const campaignRef = ref(database, `/nova-vote/campaigns/${campaignId}`);

  await set(campaignRef, {
    id: campaignId,
    name: `Nova Sessie ${new Date().toLocaleDateString("nl-NL")}`,
    createdAt: serverTimestamp(),
    settings: DEFAULT_CAMPAIGN_SETTINGS,
  });

  console.log("Campaign created:", campaignId);
}

// Create a question in Firebase
export async function createQuestion(
  campaignId: string,
  questionId: string,
  questionData: {
    title: string;
    type: "multi" | "open" | "quiz";
    options?: string[];
    correctAnswerIndex?: number;
    maxLength?: number;
  }
): Promise<void> {
  const questionRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}`);

  // Strip undefined values - Firebase rejects them
  const data: Record<string, unknown> = {
    id: questionId,
    title: questionData.title,
    type: questionData.type,
    active: true,
    createdAt: serverTimestamp(),
  };
  if (questionData.options !== undefined) data.options = questionData.options;
  if (questionData.correctAnswerIndex !== undefined) data.correctAnswerIndex = questionData.correctAnswerIndex;
  if (questionData.maxLength !== undefined) data.maxLength = questionData.maxLength;

  await set(questionRef, data);
}

// Deactivate a question
export async function deactivateQuestion(campaignId: string, questionId: string): Promise<void> {
  const activeRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}/active`);
  await set(activeRef, false);
}

// Add seed votes for multi-choice/quiz
export async function addSeedVotes(
  campaignId: string,
  questionId: string,
  seedVotes: { option: string; count: number }[],
  options: string[]
): Promise<void> {
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);

  const updates: Record<string, unknown> = {};

  seedVotes.forEach((seed, optionIndex) => {
    for (let i = 0; i < seed.count; i++) {
      const oderId = `seed_${optionIndex}_${i}`;
      updates[oderId] = {
        oderId,
        answer: seed.option,
        answerIndex: options.indexOf(seed.option),
        timestamp: serverTimestamp(),
        isSeed: true,
      };
    }
  });

  // Use set with merge-like behavior by getting existing data first
  const existingSnapshot = await get(resultsRef);
  const existingData = existingSnapshot.val() || {};
  await set(resultsRef, { ...existingData, ...updates });
}

// Add seed answers for open questions
export async function addSeedAnswers(
  campaignId: string,
  questionId: string,
  seedAnswers: string[]
): Promise<void> {
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);

  const fakeNames = [
    "Lisa de Vries", "Thomas Bakker", "Sophie Jansen", "Daan Visser",
    "Emma Smit", "Luuk Meijer", "Julia de Boer", "Bram Mulder",
    "Anna Bos", "Sander Dekker", "Eva van Dijk", "Rick Peters",
    "Laura Hendriks", "Niels Brouwer", "Fleur van den Berg",
  ];

  const updates: Record<string, unknown> = {};

  seedAnswers.forEach((answer, i) => {
    const oderId = `seed_${i}`;
    updates[oderId] = {
      oderId,
      answer,
      userName: fakeNames[i % fakeNames.length],
      timestamp: serverTimestamp(),
      isSeed: true,
    };
  });

  const existingSnapshot = await get(resultsRef);
  const existingData = existingSnapshot.val() || {};
  await set(resultsRef, { ...existingData, ...updates });
}

// Get all results for a question
export async function getResults(
  campaignId: string,
  questionId: string
): Promise<Record<string, unknown>> {
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);
  const snapshot = await get(resultsRef);
  return snapshot.val() || {};
}

// Subscribe to results (real-time)
export function subscribeToResults(
  campaignId: string,
  questionId: string,
  callback: (results: Record<string, unknown>) => void
): () => void {
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);

  onValue(resultsRef, (snapshot) => {
    callback(snapshot.val() || {});
  });

  // Return unsubscribe function
  return () => off(resultsRef);
}

// Question type for prepared questions
export interface PreparedQuestion {
  id: string;
  type: "poll" | "open";
  title: string;
  options?: string[];
  active: boolean;
  order: number;
  createdAt: unknown;
  // Seed data (loaded separately from results)
  seedVotes?: { option: string; count: number }[];
  seedAnswers?: string[];
}

// Save multiple prepared questions to Firebase (including seed data)
export async function saveQuestions(
  campaignId: string,
  questions: {
    type: "poll" | "open";
    question: string;
    options?: string[];
    seedVotes?: { option: string; count: number }[];
    seedAnswers?: string[];
  }[]
): Promise<PreparedQuestion[]> {
  const savedQuestions: PreparedQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const questionId = `q_${Date.now()}_${i}`;
    const questionRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}`);

    const questionData: PreparedQuestion = {
      id: questionId,
      type: q.type,
      title: q.question,
      ...(q.options && q.options.length > 0 ? { options: q.options } : {}),
      active: false,
      order: i + 1,
      createdAt: serverTimestamp(),
    };

    await set(questionRef, questionData);
    savedQuestions.push(questionData);

    // Save seed votes for poll questions
    if (q.type === "poll" && q.seedVotes && q.options) {
      await addSeedVotes(campaignId, questionId, q.seedVotes, q.options);
      console.log(`Saved seed votes for question ${questionId}`);
    }

    // Save seed answers for open questions
    if (q.type === "open" && q.seedAnswers) {
      await addSeedAnswers(campaignId, questionId, q.seedAnswers);
      console.log(`Saved seed answers for question ${questionId}`);
    }
  }

  return savedQuestions;
}

// Set a question as active (and deactivate all others)
export async function setQuestionActive(
  campaignId: string,
  questionId: string
): Promise<void> {
  // First, get all questions and deactivate them
  const questionsRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions`);
  const snapshot = await get(questionsRef);
  const questions = snapshot.val() || {};

  // Deactivate all questions
  for (const qId of Object.keys(questions)) {
    if (questions[qId].active) {
      const activeRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${qId}/active`);
      await set(activeRef, false);
    }
  }

  // Activate the selected question
  const activeRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}/active`);
  await set(activeRef, true);
}

// Get the currently active question
export async function getActiveQuestion(
  campaignId: string
): Promise<PreparedQuestion | null> {
  const questionsRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions`);
  const snapshot = await get(questionsRef);
  const questions = snapshot.val() || {};

  for (const qId of Object.keys(questions)) {
    if (questions[qId].active) {
      return questions[qId] as PreparedQuestion;
    }
  }

  return null;
}

// Get all questions for a campaign
export async function getQuestions(
  campaignId: string
): Promise<PreparedQuestion[]> {
  const questionsRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions`);
  const snapshot = await get(questionsRef);
  const questions = snapshot.val() || {};

  return Object.values(questions) as PreparedQuestion[];
}

// Subscribe to questions (real-time)
export function subscribeToQuestions(
  campaignId: string,
  callback: (questions: PreparedQuestion[]) => void
): () => void {
  const questionsRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions`);

  onValue(questionsRef, (snapshot) => {
    const questions = snapshot.val() || {};
    const questionsList = (Object.values(questions) as Record<string, unknown>[]).map((q) => ({
      ...q,
      type: q.type === "multi" ? "poll" : q.type,
    })) as PreparedQuestion[];
    questionsList.sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(questionsList);
  });

  // Return unsubscribe function
  return () => off(questionsRef);
}

// Subscribe to results of active question (real-time)
// Returns parsed seed data: seedVotes for polls, seedAnswers for open questions
export function subscribeToActiveQuestionResults(
  campaignId: string,
  questionId: string,
  questionType: "poll" | "open",
  options: string[] | undefined,
  callback: (data: { seedVotes?: { option: string; count: number }[]; seedAnswers?: string[] }) => void
): () => void {
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);

  onValue(resultsRef, (snapshot) => {
    const results = snapshot.val() || {};

    if (questionType === "poll" && options) {
      // Count votes per option
      const voteCounts: Record<string, number> = {};
      options.forEach(opt => voteCounts[opt] = 0);

      Object.values(results).forEach((vote: unknown) => {
        const v = vote as { answer?: string };
        if (v.answer && voteCounts[v.answer] !== undefined) {
          voteCounts[v.answer]++;
        }
      });

      const seedVotes = options.map(opt => ({ option: opt, count: voteCounts[opt] }));
      callback({ seedVotes });
    } else {
      // Collect answers for open question
      const seedAnswers: string[] = [];
      Object.values(results).forEach((answer: unknown) => {
        const a = answer as { answer?: string };
        if (a.answer) {
          seedAnswers.push(a.answer);
        }
      });
      callback({ seedAnswers });
    }
  });

  return () => off(resultsRef);
}

export { database, ref, set, get, onValue, off, serverTimestamp, remove, push, update };
