'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MoreVertical, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { getCampaigns, deleteCampaign, createCampaignAdmin, updateCampaign, getCampaignStats, type Campaign } from '@/lib/firebase-admin';
import Modal from '@/components/admin/Modal';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface CampaignWithStats extends Campaign {
  questionCount?: number;
  totalResponses?: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();

      // Load stats for each campaign
      const withStats = await Promise.all(
        data.map(async (campaign) => {
          const stats = await getCampaignStats(campaign.id);
          return { ...campaign, ...stats };
        })
      );

      setCampaigns(withStats);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openDropdown]);

  const handleCreate = () => {
    setEditingCampaign(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({ name: campaign.name, description: campaign.description || '' });
    setIsModalOpen(true);
    setOpenDropdown(null);
  };

  const handleDelete = (campaign: Campaign) => {
    setDeletingCampaign(campaign);
    setIsDeleteModalOpen(true);
    setOpenDropdown(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, formData);
      } else {
        await createCampaignAdmin(formData);
      }
      setIsModalOpen(false);
      loadCampaigns();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    }

    setSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCampaign) return;

    try {
      await deleteCampaign(deletingCampaign.id);
      setIsDeleteModalOpen(false);
      setDeletingCampaign(null);
      loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500 mt-1">Beheer je interactieve sessies</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={20} />
          Nieuwe Campaign
        </button>
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="text-slate-400" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nog geen campaigns</h3>
          <p className="text-slate-500 mb-6">Maak je eerste campaign om te beginnen.</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={20} />
            Nieuwe Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-indigo-200 transition-all group relative flex flex-col"
            >
              {/* Dropdown Menu */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === campaign.id ? null : campaign.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical size={18} />
                </button>

                {openDropdown === campaign.id && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={() => handleEdit(campaign)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={16} />
                      Bewerken
                    </button>
                    <button
                      onClick={() => handleDelete(campaign)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Verwijderen
                    </button>
                  </div>
                )}
              </div>

              <Link href={`/admin/campaigns/${campaign.id}`} className="flex flex-col flex-1 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {campaign.name}
                </h3>

                {campaign.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{campaign.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-500 mt-auto pt-4">
                  <span>{campaign.questionCount || 0} vragen</span>
                  <span className="text-slate-300">•</span>
                  <span>{campaign.totalResponses || 0} responses</span>
                </div>
              </Link>

              <div className="px-6 py-3 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Aangemaakt {new Date(campaign.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>{new Date(campaign.createdAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCampaign ? 'Campaign bewerken' : 'Nieuwe campaign'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Naam
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Bijv. Innovatie Sessie 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Beschrijving (optioneel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="Korte beschrijving van de campaign..."
            />
          </div>

          <div className="flex gap-3 pt-4">
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
          setDeletingCampaign(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Campaign verwijderen"
        message={`Weet je zeker dat je "${deletingCampaign?.name}" wilt verwijderen? Alle vragen en resultaten worden ook verwijderd.`}
        confirmText="Verwijderen"
        variant="danger"
      />
    </div>
  );
}
