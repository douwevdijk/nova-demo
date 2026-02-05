'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/admin/campaigns');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/admin/campaigns');
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      setError(firebaseError.message || 'Er is een fout opgetreden.');
      setLoading(false);
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "2px solid rgba(25, 89, 105, 0.3)",
            borderTopColor: "#195969",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div className="admin-layout fixed inset-0 overflow-hidden" style={{ background: "#0a0a0a" }}>
      {/* Subtle radial background */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(25, 89, 105, 0.12) 0%, transparent 50%)",
        }}
      />

      {/* Animated pulse rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: `${280 + i * 140}px`,
            height: `${280 + i * 140}px`,
            border: `2px solid rgba(25, 89, 105, ${0.25 - i * 0.07})`,
            transform: "translate(-50%, -50%)",
            animation: `pulse-expand ${3.5 + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ padding: "40px 20px" }}>
        {/* Buzzmaster Logo */}
        <div style={{ marginBottom: "6px", position: "relative" }}>
          <svg style={{ position: "absolute", width: 0, height: 0 }}>
            <defs>
              <filter id="black-to-white">
                <feColorMatrix
                  type="matrix"
                  values="-1 0 0 0 1
                          0 -1 0 0 1
                          0 0 -1 0 1
                          0 0 0 1 0"
                />
              </filter>
            </defs>
          </svg>
          <img
            src="/logo.png"
            alt="Buzzmaster"
            style={{
              width: "180px",
              height: "auto",
              objectFit: "contain",
              filter: "url(#black-to-white)",
            }}
          />
        </div>

        {/* NOVA AI Title */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "flex-start", marginBottom: "28px" }}>
          {/* N background glow */}
          <div
            style={{
              position: "absolute",
              width: "100px",
              height: "100px",
              left: "-10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "radial-gradient(circle, rgba(25, 89, 105, 0.8) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />

          {/* NOVA letters */}
          <span style={{ fontSize: "4rem", fontWeight: 900, color: "#195969", textShadow: "0 0 30px rgba(25, 89, 105, 0.8), 0 0 60px rgba(25, 89, 105, 0.5)", position: "relative", zIndex: 2 }}>N</span>
          <span style={{ fontSize: "4rem", fontWeight: 800, color: "white", position: "relative", zIndex: 2, marginLeft: "-2px" }}>O</span>
          <span style={{ fontSize: "4rem", fontWeight: 800, color: "white", position: "relative", zIndex: 2 }}>V</span>
          <span style={{ fontSize: "4rem", fontWeight: 800, color: "white", position: "relative", zIndex: 2 }}>A</span>

          {/* ADMIN badge */}
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "#f30349",
              letterSpacing: "0.05em",
              marginLeft: "4px",
              marginTop: "4px",
              padding: "3px 8px",
              background: "rgba(243, 3, 73, 0.15)",
              border: "1px solid rgba(243, 3, 73, 0.4)",
              borderRadius: "6px",
              position: "relative",
              zIndex: 2,
              textTransform: "uppercase",
              boxShadow: "0 0 10px rgba(243, 3, 73, 0.3)",
              alignSelf: "flex-start",
            }}
          >
            ADMIN
          </span>
        </div>

        {/* Login Form */}
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "28px",
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                background: "rgba(243, 3, 73, 0.1)",
                border: "1px solid rgba(243, 3, 73, 0.3)",
                borderRadius: "10px",
                color: "#f30349",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mailadres"
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "14px 16px",
                color: "white",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                outline: "none",
                marginBottom: "12px",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(25, 89, 105, 0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"; }}
            />

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "14px 16px",
                color: "white",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                outline: "none",
                marginBottom: "20px",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(25, 89, 105, 0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)"; }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#195969",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "14px 24px",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#1a6a7a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#195969"; }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Inloggen...
                </>
              ) : (
                <>
                  Inloggen
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* CSS Animation */}
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
      `}</style>
    </div>
  );
}
