'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getAuth,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';

// Firebase config - same as existing
const firebaseConfig = {
  apiKey: "AIzaSyB9L73dyPoocEJ1_ApEmLuc5tjwixffwKc",
  authDomain: "me-do.firebaseapp.com",
  databaseURL: "https://me-do.firebaseio.com",
  projectId: "firebase-me-do",
  storageBucket: "firebase-me-do.appspot.com",
  messagingSenderId: "1012066892690",
  appId: "1:1012066892690:web:e63e369e7ad96d296edf4b",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const message = firebaseError.code === 'auth/invalid-credential'
        ? 'Onjuist e-mailadres of wachtwoord.'
        : firebaseError.message || 'Er is een fout opgetreden.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      setError(firebaseError.message || 'Er is een fout opgetreden.');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
