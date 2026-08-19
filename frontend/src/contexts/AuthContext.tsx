import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export interface Profile {
  id: string;
  full_name: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  shop_id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined,
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function loadProfile(
    userId: string,
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name, role, shop_id",
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "Failed to load profile:",
        error,
      );

      setProfile(null);

      return;
    }

    setProfile(data);
  }

  useEffect(() => {
    async function initializeAuth() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      setSession(session);

      if (session?.user) {
        await loadProfile(
          session.user.id,
        );
      }

      setLoading(false);
    }

    initializeAuth();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session,
        ) => {
          setSession(session);

          if (session?.user) {
            await loadProfile(
              session.user.id,
            );
          } else {
            setProfile(null);
          }

          setLoading(false);
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  const value: AuthContextType = {
    user:
      session?.user ?? null,

    session,

    profile,

    loading,

    signOut,
  };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}