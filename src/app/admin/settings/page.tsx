'use client';

import { useState } from 'react';
import { Settings, Check } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Instellingen</h1>
        <p className="text-slate-500 mt-1">Beheer je account en voorkeuren</p>
      </div>

      {/* Settings Card */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Account</h2>
          <p className="text-sm text-slate-500 mt-1">Je accountgegevens en instellingen</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Placeholder settings */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">E-mail notificaties</p>
              <p className="text-sm text-slate-500">Ontvang updates over je campaigns</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              <p className="font-medium text-slate-900">Donkere modus</p>
              <p className="text-sm text-slate-500">Schakel tussen licht en donker thema</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saved ? (
              <>
                <Check size={18} />
                Opgeslagen
              </>
            ) : (
              'Opslaan'
            )}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Nova Admin</h3>
            <p className="text-sm text-slate-500 mt-1">
              Versie 1.0.0 • Gebouwd met Next.js en Firebase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
