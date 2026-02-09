'use client';

import { useState } from 'react';
import { database, ref, push, serverTimestamp } from '@/lib/firebase';
import type { PreparedQuestion } from '@/lib/firebase';

interface VoteQuestionProps {
  question: PreparedQuestion;
  campaignId: string;
  userId: string;
  userName: string;
  onSubmitted: (questionId: string) => void;
}

export function VoteQuestion({ question, campaignId, userId, userName, onSubmitted }: VoteQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');

  const maxLength = 150;

  const handlePollSelect = async (index: number) => {
    if (submitting || selectedIndex !== null) return;
    setSelectedIndex(index);
    setSubmitting(true);

    try {
      await push(ref(database, `nova-vote/results/${campaignId}/${question.id}`), {
        answer: question.options![index],
        answerIndex: index,
        userId,
        timestamp: serverTimestamp(),
        isSeed: false,
      });
      // Brief visual feedback before confirming
      setTimeout(() => onSubmitted(question.id), 600);
    } catch {
      // Reset on error so user can retry
      setSelectedIndex(null);
      setSubmitting(false);
    }
  };

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    try {
      await push(ref(database, `nova-vote/results/${campaignId}/${question.id}`), {
        answer: trimmed,
        userName,
        userId,
        timestamp: serverTimestamp(),
        isSeed: false,
      });
      onSubmitted(question.id);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '540px',
        animation: 'fade-up 0.4s ease-out',
      }}
    >
      {/* Question title */}
      <h2
        style={{
          color: 'white',
          fontSize: '1.3rem',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '24px',
          lineHeight: 1.35,
        }}
      >
        {question.title}
      </h2>

      {question.type === 'poll' && question.options ? (
        /* Poll options */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {question.options.map((option, index) => {
            const isSelected = selectedIndex === index;

            return (
              <button
                key={index}
                onClick={() => handlePollSelect(index)}
                disabled={submitting}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 18px',
                  background: isSelected ? 'rgba(243, 3, 73, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${isSelected ? 'rgba(243, 3, 73, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: selectedIndex !== null && !isSelected ? 0.4 : 1,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  fontFamily: 'inherit',
                }}
              >
                {/* Letter badge */}
                <span
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: isSelected ? 'rgba(243, 3, 73, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </span>

                {/* Option text */}
                <span
                  style={{
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    flex: 1,
                  }}
                >
                  {option}
                </span>

                {/* Selected checkmark */}
                {isSelected && (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, animation: 'check-appear 0.3s ease-out' }}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Open question */
        <form onSubmit={handleOpenSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxLength))}
            placeholder="Typ je antwoord..."
            rows={3}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '16px 18px',
              color: 'white',
              fontSize: '1rem',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              minHeight: '80px',
              marginBottom: '8px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(243, 3, 73, 0.5)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
          />

          {/* Character counter */}
          <div
            style={{
              textAlign: 'right',
              fontSize: '0.8rem',
              color: text.length >= maxLength ? '#f30349' : 'rgba(255,255,255,0.35)',
              marginBottom: '16px',
            }}
          >
            {text.length}/{maxLength}
          </div>

          <button
            type="submit"
            disabled={!text.trim() || submitting}
            style={{
              width: '100%',
              background: !text.trim() || submitting ? 'rgba(243, 3, 73, 0.4)' : '#f30349',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.05rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: !text.trim() || submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {submitting ? (
              <>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Versturen...
              </>
            ) : (
              'Verstuur'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
