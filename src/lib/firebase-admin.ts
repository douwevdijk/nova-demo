// Firebase admin functions for campaign and question management
import { ref, set, get, remove, push, serverTimestamp, update } from "firebase/database";
import { database } from "./firebase";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  title: string;
  type: "poll" | "open" | "multi" | "multi";
  options: QuestionOption[];
  isProfileQuestion: boolean;
  profileField: string | null;
  order: number;
  active: boolean;
  createdAt: number;
}

export interface CampaignPrompt {
  topic: string;
  audience: string;
  tone: string;
  notes: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "completed";
  createdAt: number;
  updatedAt?: number;
  prompt?: CampaignPrompt;
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function getCampaigns(): Promise<Campaign[]> {
  const campaignsRef = ref(database, "/nova-vote/campaigns");
  const snapshot = await get(campaignsRef);
  const data = snapshot.val() || {};

  return Object.values(data)
    .map((c) => c as Campaign)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const campaignRef = ref(database, `/nova-vote/campaigns/${campaignId}`);
  const snapshot = await get(campaignRef);
  return snapshot.val() as Campaign | null;
}

export async function createCampaignAdmin(data: { name: string; description?: string }): Promise<string> {
  const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const campaignRef = ref(database, `/nova-vote/campaigns/${campaignId}`);

  await set(campaignRef, {
    id: campaignId,
    name: data.name,
    description: data.description || "",
    status: "draft",
    createdAt: Date.now(),
  });

  return campaignId;
}

export async function updateCampaign(campaignId: string, data: Partial<Campaign>): Promise<void> {
  const campaignRef = ref(database, `/nova-vote/campaigns/${campaignId}`);
  await update(campaignRef, {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  // Delete campaign
  const campaignRef = ref(database, `/nova-vote/campaigns/${campaignId}`);
  await remove(campaignRef);

  // Delete associated results
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}`);
  await remove(resultsRef);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function getQuestions(campaignId: string): Promise<Question[]> {
  const questionsRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions`);
  const snapshot = await get(questionsRef);
  const data = snapshot.val() || {};

  return Object.values(data)
    .map((q) => q as Question)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getQuestion(campaignId: string, questionId: string): Promise<Question | null> {
  const questionRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}`);
  const snapshot = await get(questionRef);
  return snapshot.val() as Question | null;
}

export async function createQuestion(
  campaignId: string,
  data: {
    title: string;
    type: "poll" | "open" | "multi";
    options?: { label: string }[];
    isProfileQuestion?: boolean;
    profileField?: string;
  }
): Promise<string> {
  // Get current questions to determine order
  const questions = await getQuestions(campaignId);
  const nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order)) + 1 : 0;

  const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const questionRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}`);

  // Generate option IDs
  const options: QuestionOption[] = (data.options || []).map((opt, index) => ({
    id: `opt_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    label: opt.label,
  }));

  await set(questionRef, {
    id: questionId,
    title: data.title,
    type: data.type,
    options,
    isProfileQuestion: data.isProfileQuestion || false,
    profileField: data.isProfileQuestion ? (data.profileField || null) : null,
    order: nextOrder,
    active: false,
    createdAt: Date.now(),
  });

  return questionId;
}

export async function updateQuestion(
  campaignId: string,
  questionId: string,
  data: {
    title?: string;
    type?: "poll" | "open" | "multi";
    options?: QuestionOption[];
    isProfileQuestion?: boolean;
    profileField?: string | null;
    order?: number;
    active?: boolean;
  }
): Promise<void> {
  const questionRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}`);

  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.options !== undefined) updateData.options = data.options;
  if (data.isProfileQuestion !== undefined) {
    updateData.isProfileQuestion = data.isProfileQuestion;
    updateData.profileField = data.isProfileQuestion ? (data.profileField || null) : null;
  }
  if (data.order !== undefined) updateData.order = data.order;
  if (data.active !== undefined) updateData.active = data.active;

  await update(questionRef, updateData);
}

export async function deleteQuestion(campaignId: string, questionId: string): Promise<void> {
  const questionRef = ref(database, `/nova-vote/campaigns/${campaignId}/questions/${questionId}`);
  await remove(questionRef);

  // Also delete results for this question
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);
  await remove(resultsRef);
}

export async function reorderQuestions(campaignId: string, questionIds: string[]): Promise<void> {
  const updates: Record<string, number> = {};

  questionIds.forEach((id, index) => {
    updates[`/nova-vote/campaigns/${campaignId}/questions/${id}/order`] = index;
  });

  await update(ref(database), updates);
}

// Set a question as active (deactivate all others)
export async function setQuestionActiveAdmin(campaignId: string, questionId: string): Promise<void> {
  const questions = await getQuestions(campaignId);

  const updates: Record<string, boolean> = {};
  questions.forEach(q => {
    updates[`/nova-vote/campaigns/${campaignId}/questions/${q.id}/active`] = q.id === questionId;
  });

  await update(ref(database), updates);
}

// Deactivate all questions
export async function deactivateAllQuestions(campaignId: string): Promise<void> {
  const questions = await getQuestions(campaignId);

  const updates: Record<string, boolean> = {};
  questions.forEach(q => {
    updates[`/nova-vote/campaigns/${campaignId}/questions/${q.id}/active`] = false;
  });

  await update(ref(database), updates);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS / STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

export async function getQuestionResultCount(campaignId: string, questionId: string): Promise<number> {
  const resultsRef = ref(database, `/nova-vote/results/${campaignId}/${questionId}`);
  const snapshot = await get(resultsRef);
  const data = snapshot.val() || {};
  return Object.keys(data).length;
}

export async function getCampaignStats(campaignId: string): Promise<{
  questionCount: number;
  totalResponses: number;
  activeQuestion: Question | null;
}> {
  const questions = await getQuestions(campaignId);

  let totalResponses = 0;
  let activeQuestion: Question | null = null;

  for (const q of questions) {
    const count = await getQuestionResultCount(campaignId, q.id);
    totalResponses += count;
    if (q.active) activeQuestion = q;
  }

  return {
    questionCount: questions.length,
    totalResponses,
    activeQuestion,
  };
}
