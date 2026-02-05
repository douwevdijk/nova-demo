'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Verwijderen',
  cancelText = 'Annuleren',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
    },
    default: {
      icon: AlertTriangle,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
            <Icon className={styles.iconColor} size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${styles.button}`}
          >
            {loading ? 'Bezig...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
