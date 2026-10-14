import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

interface FirebaseUser {
  fullName: string | null;
  firstName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}

export interface UseFirebaseAuth {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  user: FirebaseUser | null;
  signOut: () => Promise<void>;
}

export function useFirebaseAuth(): UseFirebaseAuth {
  const [isLoaded, setIsLoaded] = useState(false);
  const [spUser, setSpUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSpUser(session?.user ?? null);
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSpUser(session?.user ?? null);
      setIsLoaded(true);
    });

    let removeResumeListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const stateListenerPromise = CapApp.addListener("appStateChange", async (state) => {
        if (state.isActive) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              setSpUser(session.user);
            } else {
              const { data: refreshed } = await supabase.auth.refreshSession();
              if (refreshed?.session?.user) {
                setSpUser(refreshed.session.user);
              }
            }
          } catch {}
        }
      });
      removeResumeListener = () => {
        stateListenerPromise.then(l => l.remove()).catch(() => {});
      };
    }

    return () => {
      subscription.unsubscribe();
      if (removeResumeListener) removeResumeListener();
    };
  }, []);

  return {
    isLoaded,
    isSignedIn: !!spUser,
    userId: spUser?.id ?? null,
    getToken: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        return refreshed?.session?.access_token ?? null;
      } catch {
        return null;
      }
    },
    user: spUser
      ? {
          fullName: spUser.user_metadata?.full_name || spUser.email?.split("@")[0] || null,
          firstName: (spUser.user_metadata?.full_name || spUser.email)?.split(" ")[0] || null,
          imageUrl: spUser.user_metadata?.avatar_url || spUser.user_metadata?.picture || spUser.user_metadata?.photo_url || null,
          primaryEmailAddress: spUser.email ? { emailAddress: spUser.email } : null,
        }
      : null,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
