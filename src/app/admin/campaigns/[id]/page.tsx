'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Sparkles,
  Loader2,
  Check,
  Settings,
  ChevronDown,
} from 'lucide-react';
import {
  getCampaign,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  setQuestionActiveAdmin,
  deactivateAllQuestions,
  updateCampaign,
  type Campaign,
  type Question,
  type QuestionOption,
  type CampaignPrompt,
} from '@/lib/firebase-admin';
import Modal from '@/components/admin/Modal';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

type TabType = 'settings' | 'questions';

// Custom Select Component for Safari
function CustomSelect({
  value,
  onChange,
  options,
  className = ''
}: {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-4 py-2.5 pr-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
      >
        {options.map(opt => (
          <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}

export default function CampaignDetailPage({ params }: PageProps) {
  const { id: campaignId } = use(params);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  // Question modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'completed',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // AI Generation state
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1);
  const [aiPrompt, setAiPrompt] = useState<CampaignPrompt>({
    topic: '',
    audience: '',
    tone: '',
    notes: '',
  });
  const [questionCount, setQuestionCount] = useState(3);
  const [questionType, setQuestionType] = useState<'poll' | 'open' | 'quiz' | 'mix'>('mix');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{
    type: 'poll' | 'open' | 'quiz';
    question: string;
    options?: string[];
    selected: boolean;
  }>>([]);

  // Question form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'poll' as 'poll' | 'open' | 'multi' | 'quiz',
    options: [{ id: '', label: '' }, { id: '', label: '' }] as QuestionOption[],
    isProfileQuestion: false,
    profileField: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignData, questionsData] = await Promise.all([
        getCampaign(campaignId),
        getQuestions(campaignId),
      ]);
      setCampaign(campaignData);
      setQuestions(questionsData);

      if (campaignData) {
        setSettingsForm({
          name: campaignData.name,
          description: campaignData.description || '',
          status: campaignData.status,
        });
        if (campaignData.prompt) {
          setAiPrompt(campaignData.prompt);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

  // Settings handlers
  const handleSaveSettings = async () => {
    if (!settingsForm.name.trim()) return;
    setSavingSettings(true);
    try {
      await updateCampaign(campaignId, {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim(),
        status: settingsForm.status,
      });
      setCampaign(prev => prev ? { ...prev, ...settingsForm } : null);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    setSavingSettings(false);
  };

  // AI Generation handlers
  const handleGenerateQuestions = async () => {
    if (!aiPrompt.topic.trim()) return;
    setGenerating(true);
    setGeneratedQuestions([]);

    try {
      const response = await fetch('/api/prepare-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiPrompt.topic,
          audience: aiPrompt.audience,
          tone: aiPrompt.tone,
          notes: aiPrompt.notes,
          questionCount,
          questionType,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      const questions = (data.questions || []).map((q: { type: string; question: string; options?: string[] }) => ({
        ...q,
        selected: true,
      }));
      setGeneratedQuestions(questions);
      setAiStep(2);

      await updateCampaign(campaignId, { prompt: aiPrompt });
    } catch (error) {
      console.error('Failed to generate questions:', error);
    }
    setGenerating(false);
  };

  const handleSaveGeneratedQuestions = async () => {
    const selectedQuestions = generatedQuestions.filter(q => q.selected);
    if (selectedQuestions.length === 0) return;

    setSaving(true);
    try {
      for (const q of selectedQuestions) {
        await createQuestion(campaignId, {
          title: q.question,
          type: q.type,
          options: q.options?.map(label => ({ label })) || [],
        });
      }
      setGeneratedQuestions([]);
      setShowAIGenerator(false);
      setAiStep(1);
      loadData();
    } catch (error) {
      console.error('Failed to save questions:', error);
    }
    setSaving(false);
  };

  const toggleQuestionSelection = (index: number) => {
    setGeneratedQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, selected: !q.selected } : q
    ));
  };

  // Question CRUD handlers
  const handleCreate = () => {
    setEditingQuestion(null);
    setFormData({
      title: '',
      type: 'poll',
      options: [{ id: '', label: '' }, { id: '', label: '' }],
      isProfileQuestion: false,
      profileField: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      title: question.title,
      type: question.type,
      options: question.options && question.options.length > 0 ? question.options : [{ id: '', label: '' }, { id: '', label: '' }],
      isProfileQuestion: question.isProfileQuestion,
      profileField: question.profileField || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (question: Question) => {
    setDeletingQuestion(question);
    setIsDeleteModalOpen(true);
  };

  const handleToggleActive = async (question: Question) => {
    // Optimistic update — no full reload
    const newActive = !question.active;
    setQuestions(prev => prev.map(q => ({
      ...q,
      active: q.id === question.id ? newActive : false,
    })));

    try {
      if (question.active) {
        await deactivateAllQuestions(campaignId);
      } else {
        await setQuestionActiveAdmin(campaignId, question.id);
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
      loadData(); // Rollback on error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const validOptions = formData.options
        .filter(opt => opt.label.trim() !== '')
        .map(opt => ({
          id: opt.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          label: opt.label.trim(),
        }));

      if (editingQuestion) {
        await updateQuestion(campaignId, editingQuestion.id, {
          title: formData.title,
          type: formData.type,
          options: validOptions,
          isProfileQuestion: formData.isProfileQuestion,
          profileField: formData.isProfileQuestion ? formData.profileField : null,
        });
      } else {
        await createQuestion(campaignId, {
          title: formData.title,
          type: formData.type,
          options: validOptions.map(opt => ({ label: opt.label })),
          isProfileQuestion: formData.isProfileQuestion,
          profileField: formData.profileField,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to save question:', error);
    }

    setSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingQuestion) return;

    try {
      await deleteQuestion(campaignId, deletingQuestion.id);
      setIsDeleteModalOpen(false);
      setDeletingQuestion(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { id: '', label: '' }],
    });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const updateOption = (index: number, label: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], label };
    setFormData({ ...formData, options: newOptions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Campaign niet gevonden</p>
        <Link href="/admin/campaigns" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
          Terug naar overzicht
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Terug naar campaigns
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
        {campaign.description && (
          <p className="text-slate-500 mt-1">{campaign.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings size={18} />
            Instellingen
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare size={18} />
            Vragen
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'questions' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {questions.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Campaign instellingen</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Naam
                </label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Campaign naam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Beschrijving
                </label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Korte beschrijving..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <CustomSelect
                  value={settingsForm.status}
                  onChange={(val) => setSettingsForm({ ...settingsForm, status: val as 'draft' | 'active' | 'completed' })}
                  options={[
                    { value: 'draft', label: 'Concept' },
                    { value: 'active', label: 'Actief' },
                    { value: 'completed', label: 'Afgerond' },
                  ]}
                  className="w-48"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || !settingsForm.name.trim()}
                  className={`flex items-center justify-center gap-2 min-w-[140px] px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed ${
                    settingsSaved
                      ? 'bg-green-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                  }`}
                >
                  {savingSettings ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Opslaan...</span>
                    </>
                  ) : settingsSaved ? (
                    <>
                      <Check size={16} className="animate-[scaleIn_0.2s_ease-out]" />
                      <span>Opgeslagen!</span>
                    </>
                  ) : (
                    <span>Wijzigingen opslaan</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => { setAiStep(1); setGeneratedQuestions([]); setShowAIGenerator(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Sparkles size={18} />
              AI Genereren
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-lg text-sm font-medium"
              style={{ padding: '10px 16px', backgroundColor: '#4f46e5', color: '#ffffff', cursor: 'pointer', border: 'none' }}
            >
              <Plus size={18} />
              Nieuwe vraag
            </button>
          </div>

          {/* AI Generator Modal */}
          <Modal
            isOpen={showAIGenerator}
            onClose={() => setShowAIGenerator(false)}
            title={aiStep === 1 ? 'AI Vragen Genereren' : aiStep === 2 ? 'Vragen selecteren' : 'Toevoegen'}
            size="lg"
          >
            <div className="p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{
                        backgroundColor: aiStep >= step ? '#9333ea' : '#e2e8f0',
                        color: aiStep >= step ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      {aiStep > step ? '\u2713' : step}
                    </div>
                    <span className={`text-xs font-medium ${aiStep >= step ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step === 1 ? 'Configuratie' : step === 2 ? 'Voorstel' : 'Toevoegen'}
                    </span>
                    {step < 3 && <div className="w-8 h-px" style={{ backgroundColor: aiStep > step ? '#9333ea' : '#e2e8f0' }} />}
                  </div>
                ))}
              </div>

              {/* Step 1: Config */}
              {aiStep === 1 && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Onderwerp *</label>
                      <input
                        type="text"
                        value={aiPrompt.topic}
                        onChange={(e) => setAiPrompt({ ...aiPrompt, topic: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        placeholder="Bijv. Digitale transformatie, AI in de zorg..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Doelgroep</label>
                      <input
                        type="text"
                        value={aiPrompt.audience}
                        onChange={(e) => setAiPrompt({ ...aiPrompt, audience: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        placeholder="Bijv. HR managers, studenten, directie..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Gewenste toon</label>
                      <input
                        type="text"
                        value={aiPrompt.tone}
                        onChange={(e) => setAiPrompt({ ...aiPrompt, tone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        placeholder="Bijv. Professioneel, informeel, humoristisch..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Extra notities</label>
                      <input
                        type="text"
                        value={aiPrompt.notes}
                        onChange={(e) => setAiPrompt({ ...aiPrompt, notes: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        placeholder="Bijv. Focus op praktische toepassingen..."
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Aantal vragen</label>
                      <CustomSelect
                        value={questionCount}
                        onChange={(val) => setQuestionCount(parseInt(val))}
                        options={[2, 3, 4, 5, 6, 7, 8].map(n => ({ value: n, label: `${n} vragen` }))}
                        className="w-32"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Type vragen</label>
                      <CustomSelect
                        value={questionType}
                        onChange={(val) => setQuestionType(val as 'poll' | 'open' | 'quiz' | 'mix')}
                        options={[
                          { value: 'mix', label: 'Mix (alle types)' },
                          { value: 'poll', label: 'Alleen polls' },
                          { value: 'open', label: 'Alleen open vragen' },
                          { value: 'quiz', label: 'Alleen quizvragen' },
                        ]}
                        className="w-48"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setShowAIGenerator(false)}
                      className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={generating || !aiPrompt.topic.trim()}
                      className="flex items-center gap-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ padding: '10px 20px', backgroundColor: '#9333ea', color: '#ffffff', cursor: 'pointer', border: 'none' }}
                    >
                      {generating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Genereren...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Genereer vragen
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Review generated questions */}
              {aiStep === 2 && (
                <div>
                  <p className="text-sm text-slate-500 mb-4">
                    {generatedQuestions.filter(q => q.selected).length} van {generatedQuestions.length} vragen geselecteerd. Klik om te (de)selecteren.
                  </p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto mb-6">
                    {generatedQuestions.map((q, index) => (
                      <div
                        key={index}
                        onClick={() => toggleQuestionSelection(index)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          q.selected
                            ? 'border-purple-300 ring-1 ring-purple-200 bg-purple-50/50'
                            : 'border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0"
                            style={{
                              backgroundColor: q.selected ? '#9333ea' : '#ffffff',
                              borderColor: q.selected ? '#9333ea' : '#cbd5e1',
                            }}
                          >
                            {q.selected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                q.type === 'poll' ? 'bg-blue-100 text-blue-700' : q.type === 'quiz' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {q.type === 'poll' ? 'Poll' : q.type === 'quiz' ? 'Quiz' : 'Open'}
                              </span>
                            </div>
                            <p className="font-medium text-slate-900 text-sm">{q.question}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setAiStep(1)}
                      className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Terug
                    </button>
                    <button
                      onClick={handleSaveGeneratedQuestions}
                      disabled={saving || generatedQuestions.filter(q => q.selected).length === 0}
                      className="flex items-center gap-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#ffffff', cursor: 'pointer', border: 'none' }}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Toevoegen...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Toevoegen aan campaign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Modal>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-slate-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nog geen vragen</h3>
              <p className="text-slate-500 mb-6">Voeg je eerste vraag toe aan deze campaign.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => { setAiStep(1); setGeneratedQuestions([]); setShowAIGenerator(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <Sparkles size={18} />
                  Genereer met AI
                </button>
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 rounded-lg text-sm font-medium"
                  style={{ padding: '10px 16px', backgroundColor: '#4f46e5', color: '#ffffff', cursor: 'pointer', border: 'none' }}
                >
                  <Plus size={18} />
                  Handmatig toevoegen
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={`bg-white border rounded-xl p-4 transition-colors ${
                    question.active
                      ? 'border-green-300 ring-1 ring-green-200 bg-green-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle button */}
                    <button
                      onClick={() => handleToggleActive(question)}
                      className="flex-shrink-0 rounded-lg text-sm font-semibold"
                      style={{
                        minWidth: 80,
                        padding: '10px 20px',
                        backgroundColor: question.active ? '#16a34a' : '#1e293b',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {question.active ? '● Live' : 'Activeer'}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          question.type === 'poll' || question.type === 'multi'
                            ? 'bg-blue-100 text-blue-700'
                            : question.type === 'quiz'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}>
                          {question.type === 'poll' || question.type === 'multi' ? 'Poll' : question.type === 'quiz' ? 'Quiz' : 'Open'}
                        </span>
                        {question.isProfileQuestion && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            {question.profileField || 'Profiel'}
                          </span>
                        )}
                        {question.active && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wide">
                            Actief
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-900 mt-1 truncate">{question.title}</p>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(question)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Bewerken"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(question)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Question Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion ? 'Vraag bewerken' : 'Nieuwe vraag'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vraag
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Bijv. Uit welke regio kom je?"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="poll"
                  checked={formData.type === 'poll'}
                  onChange={() => setFormData({ ...formData, type: 'poll' })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Poll (meerkeuze)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="open"
                  checked={formData.type === 'open'}
                  onChange={() => setFormData({ ...formData, type: 'open' })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Open vraag</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="quiz"
                  checked={formData.type === 'quiz'}
                  onChange={() => setFormData({ ...formData, type: 'quiz' })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Quiz (tekstveld)</span>
              </label>
            </div>
          </div>

          {/* Options (only for poll) */}
          {formData.type === 'poll' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Opties
              </label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder={`Optie ${index + 1}`}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Optie toevoegen
              </button>
            </div>
          )}

          {/* Profile Question Toggle */}
          <div className="border-t border-slate-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isProfileQuestion}
                onChange={(e) => setFormData({ ...formData, isProfileQuestion: e.target.checked })}
                className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Dit is een profielvraag</span>
                <p className="text-sm text-slate-500 mt-0.5">
                  Het antwoord wordt opgeslagen in het profiel van de deelnemer en meegestuurd met alle volgende antwoorden.
                </p>
              </div>
            </label>

            {formData.isProfileQuestion && (
              <div className="mt-4 ml-7">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Profielveld naam
                </label>
                <input
                  type="text"
                  value={formData.profileField}
                  onChange={(e) => setFormData({ ...formData, profileField: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Bijv. region, role, team"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Dit wordt de key in het profiel object (bijv. &quot;region&quot; voor regio vragen)
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingQuestion(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Vraag verwijderen"
        message={`Weet je zeker dat je "${deletingQuestion?.title}" wilt verwijderen? Alle antwoorden worden ook verwijderd.`}
        confirmText="Verwijderen"
        variant="danger"
      />
    </div>
  );
}
