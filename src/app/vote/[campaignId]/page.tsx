'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { database, ref, push, serverTimestamp, get, subscribeToQuestions } from '@/lib/firebase';
import type { PreparedQuestion } from '@/lib/firebase';
import { VoteQuestion } from '@/components/VoteQuestion';

type PageState = 'loading' | 'not_found' | 'registering' | 'waiting' | 'voting' | 'submitted';

export default function VotePage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const [state, setState] = useState<PageState>('loading');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<PreparedQuestion | null>(null);
  const answeredIdsRef = useRef<Set<string>>(new Set());

  // Validate campaign exists
  useEffect(() => {
    get(ref(database, `nova-vote/campaigns/${campaignId}/id`)).then((snapshot) => {
      setState(snapshot.exists() ? 'registering' : 'not_found');
    }).catch(() => {
      setState('not_found');
    });
  }, [campaignId]);

  // Subscribe to active questions after registration
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToQuestions(campaignId, (questions) => {
      const active = questions.find(q => q.active) || null;
      setActiveQuestion(active);
      if (active && !answeredIdsRef.current.has(active.id)) {
        setState('voting');
      } else if (active && answeredIdsRef.current.has(active.id)) {
        setState('submitted');
      } else if (!active) {
        setState(prev => (prev === 'voting' || prev === 'submitted') ? 'waiting' : prev);
      }
    });
    return unsub;
  }, [userId, campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vul je naam in.');
      return;
    }

    setSubmitting(true);
    try {
      const userRef = await push(ref(database, `nova-vote/campaigns/${campaignId}/users`), {
        name: trimmedName,
        description: description.trim() || null,
        timestamp: serverTimestamp(),
      });
      setUserId(userRef.key);
      setState('waiting');
    } catch {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      setSubmitting(false);
    }
  };

  const handleVoteSubmitted = useCallback((questionId: string) => {
    answeredIdsRef.current.add(questionId);
    setState('submitted');
  }, []);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(243, 3, 73, 0.3)',
            borderTopColor: '#f30349',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not found state
  if (state === 'not_found') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#0a0a0a', color: 'white' }}>
        <div
          style={{
            background: 'rgba(243, 3, 73, 0.1)',
            border: '1px solid rgba(243, 3, 73, 0.3)',
            borderRadius: '16px',
            padding: '32px 40px',
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>?</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Campagne niet gevonden</div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            Controleer de link en probeer het opnieuw.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Radial background — red */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(243, 3, 73, 0.12) 0%, transparent 50%)',
        }}
      />

      {/* Pulse rings — red */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: `${280 + i * 140}px`,
            height: `${280 + i * 140}px`,
            border: `2px solid rgba(243, 3, 73, ${0.25 - i * 0.07})`,
            transform: 'translate(-50%, -50%)',
            animation: `pulse-expand ${3.5 + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {/* Mobile header with small NOVA logo — only during active question */}
      {(state === 'voting' || state === 'submitted') && <div
        className="flex items-center justify-center md:hidden"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          zIndex: 20,
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: '40px',
              height: '40px',
              left: '-4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'radial-gradient(circle, rgba(243, 3, 73, 0.7) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(10px)',
              pointerEvents: 'none',
            }}
          />
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f30349', textShadow: '0 0 15px rgba(243, 3, 73, 0.6)', position: 'relative', zIndex: 2 }}>N</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2, marginLeft: '-1px' }}>O</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2 }}>V</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2 }}>A</span>
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 800,
              color: '#f30349',
              letterSpacing: '0.04em',
              marginLeft: '5px',
              padding: '2px 6px',
              background: 'rgba(243, 3, 73, 0.15)',
              border: '1px solid rgba(243, 3, 73, 0.4)',
              borderRadius: '4px',
              textTransform: 'uppercase',
              boxShadow: '0 0 8px rgba(243, 3, 73, 0.25)',
            }}
          >
            LIVE
          </span>
        </div>
      </div>}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-start md:justify-center pt-[8vh] md:pt-10 px-4 pb-10 z-10 overflow-y-auto">

        {state === 'registering' && (
          <>
            {/* NOVA logo with LIVE badge */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start', marginBottom: '28px' }}>
              {/* N background glow — red */}
              <div
                style={{
                  position: 'absolute',
                  width: '100px',
                  height: '100px',
                  left: '-10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'radial-gradient(circle, rgba(243, 3, 73, 0.8) 0%, transparent 70%)',
                  borderRadius: '50%',
                  filter: 'blur(20px)',
                  pointerEvents: 'none',
                }}
              />

              {/* NOVA letters */}
              <span style={{ fontSize: '4rem', fontWeight: 900, color: '#f30349', textShadow: '0 0 30px rgba(243, 3, 73, 0.8), 0 0 60px rgba(243, 3, 73, 0.5)', position: 'relative', zIndex: 2 }}>N</span>
              <span style={{ fontSize: '4rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2, marginLeft: '-2px' }}>O</span>
              <span style={{ fontSize: '4rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2 }}>V</span>
              <span style={{ fontSize: '4rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2 }}>A</span>

              {/* LIVE badge */}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f30349',
                  letterSpacing: '0.05em',
                  marginLeft: '4px',
                  marginTop: '4px',
                  padding: '3px 8px',
                  background: 'rgba(243, 3, 73, 0.15)',
                  border: '1px solid rgba(243, 3, 73, 0.4)',
                  borderRadius: '6px',
                  position: 'relative',
                  zIndex: 2,
                  textTransform: 'uppercase',
                  boxShadow: '0 0 10px rgba(243, 3, 73, 0.3)',
                  alignSelf: 'flex-start',
                }}
              >
                LIVE
              </span>
            </div>

            {/* Registration form */}
            <div
              className="w-full md:max-w-[540px] p-6 md:p-10"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
              }}
            >
              {error && (
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '12px 16px',
                    background: 'rgba(243, 3, 73, 0.1)',
                    border: '1px solid rgba(243, 3, 73, 0.3)',
                    borderRadius: '10px',
                    color: '#f30349',
                    fontSize: '0.95rem',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Je naam"
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
                    marginBottom: '16px',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(243, 3, 73, 0.5)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
                />

                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Korte omschrijving (optioneel)"
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
                    marginBottom: '24px',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(243, 3, 73, 0.5)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    background: '#f30349',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#d4022e'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f30349'; }}
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
                      Even geduld...
                    </>
                  ) : (
                    <>
                      Meedoen
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        {state === 'waiting' && (
          <div style={{ textAlign: 'center' }}>
            {/* Green checkmark */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'check-appear 0.5s ease-out',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Welcome text */}
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: '12px',
                animation: 'fade-up 0.5s ease-out 0.2s both',
              }}
            >
              Welkom, {name.trim()}!
            </div>

            {/* Waiting text */}
            <div
              style={{
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '40px',
                animation: 'fade-up 0.5s ease-out 0.4s both, text-pulse 2.5s ease-in-out infinite 1s',
              }}
            >
              Wachten op de volgende vraag...
            </div>

            {/* Nova N avatar */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#f30349',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 0 20px rgba(243, 3, 73, 0.4), 0 0 40px rgba(243, 3, 73, 0.2)',
                animation: 'fade-up 0.5s ease-out 0.6s both',
              }}
            >
              <span style={{ color: 'white', fontSize: '1.3rem', fontWeight: 900 }}>N</span>
            </div>
          </div>
        )}

        {(state === 'voting' || state === 'submitted') && (
          /* Desktop inline NOVA logo above interaction */
          <div
            className="hidden md:inline-flex items-center justify-center"
            style={{
              position: 'relative',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '50px',
                height: '50px',
                left: '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'radial-gradient(circle, rgba(243, 3, 73, 0.7) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(12px)',
                pointerEvents: 'none',
              }}
            />
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f30349', textShadow: '0 0 20px rgba(243, 3, 73, 0.6)', position: 'relative', zIndex: 2 }}>N</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2, marginLeft: '-1px' }}>O</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2 }}>V</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white', position: 'relative', zIndex: 2 }}>A</span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 800,
                color: '#f30349',
                letterSpacing: '0.04em',
                marginLeft: '6px',
                padding: '2px 7px',
                background: 'rgba(243, 3, 73, 0.15)',
                border: '1px solid rgba(243, 3, 73, 0.4)',
                borderRadius: '5px',
                textTransform: 'uppercase',
                boxShadow: '0 0 8px rgba(243, 3, 73, 0.25)',
              }}
            >
              LIVE
            </span>
          </div>
        )}

        {state === 'voting' && activeQuestion && userId && (
          <VoteQuestion
            question={activeQuestion}
            campaignId={campaignId}
            userId={userId}
            userName={name.trim()}
            onSubmitted={handleVoteSubmitted}
          />
        )}

        {state === 'submitted' && (
          <div style={{ textAlign: 'center' }}>
            {/* Green checkmark */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'check-appear 0.5s ease-out',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Confirmation text */}
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: '12px',
                animation: 'fade-up 0.4s ease-out 0.1s both',
              }}
            >
              {activeQuestion?.type === 'poll' ? 'Stem ontvangen!' : 'Antwoord verstuurd!'}
            </div>

            {/* Waiting for next */}
            <div
              style={{
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '40px',
                animation: 'fade-up 0.4s ease-out 0.3s both, text-pulse 2.5s ease-in-out infinite 1s',
              }}
            >
              Wachten op de volgende vraag...
            </div>

            {/* Nova N avatar */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#f30349',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 0 20px rgba(243, 3, 73, 0.4), 0 0 40px rgba(243, 3, 73, 0.2)',
                animation: 'fade-up 0.4s ease-out 0.5s both',
              }}
            >
              <span style={{ color: 'white', fontSize: '1.3rem', fontWeight: 900 }}>N</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse-expand {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes check-appear {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fade-up {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes text-pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
