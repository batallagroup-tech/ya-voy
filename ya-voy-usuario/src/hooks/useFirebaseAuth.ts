import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

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

const CACHED_USER_KEY = "ya_voy_usuario_cached_session_v1";
const SB_STORAGE_KEY = "sb-qqwpfypjwdetljyzkogo-auth-token";

function getInitialCachedUser(): { user: SupabaseUser | null; accessToken: string | null } {
  if (typeof window === "undefined") return { user: null, accessToken: null };
  try {
    const rawSb = localStorage.getItem(SB_STORAGE_KEY);
    if (rawSb) {
      const parsed = JSON.parse(rawSb);
      if (parsed?.user?.id) {
        return { user: parsed.user, accessToken: parsed.access_token || null };
      }
    }
    const rawCustom = localStorage.getItem(CACHED_USER_KEY);
    if (rawCustom) {
      const parsed = JSON.parse(rawCustom);
      if (parsed?.user?.id) {
        return { user: parsed.user, accessToken: parsed.accessToken || null };
      }
    }
  } catch {}
  return { user: null, accessToken: null };
}

function persistCachedSession(user: SupabaseUser | null, accessToken?: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (user?.id) {
      const payload = JSON.stringify({ user, accessToken: accessToken || null, savedAt: Date.now() });
      localStorage.setItem(CACHED_USER_KEY, payload);
      Preferences.set({ key: CACHED_USER_KEY, value: payload }).catch(() => {});
    }
  } catch {}
}

function clearCachedSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(SB_STORAGE_KEY);
    Preferences.remove({ key: CACHED_USER_KEY }).catch(() => {});
    Preferences.remove({ key: SB_STORAGE_KEY }).catch(() => {});
  } catch {}
}

export function useFirebaseAuth(): UseFirebaseAuth {
  const initial = useMemo(() => getInitialCachedUser(), []);
  const [isLoaded, setIsLoaded] = useState<boolean>(!!initial.user);
  const [spUser, setSpUser] = useState<SupabaseUser | null>(initial.user);
  const cachedTokenRef = useRef<string | null>(initial.accessToken);
  const explicitSignOutRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          explicitSignOutRef.current = false;
          cachedTokenRef.current = session.access_token;
          setSpUser(session.user);
          persistCachedSession(session.user, session.access_token);
          setIsLoaded(true);
          return;
        }
        // Si getSession() vino vacío pero no hubo cierre explícito, revisar Preferences nativo
        if (!explicitSignOutRef.current) {
          const { value: prefVal } = await Preferences.get({ key: CACHED_USER_KEY });
          if (prefVal && mounted) {
            try {
              const parsed = JSON.parse(prefVal);
              if (parsed?.user?.id) {
                cachedTokenRef.current = parsed.accessToken || cachedTokenRef.current;
                setSpUser(parsed.user);
                localStorage.setItem(CACHED_USER_KEY, prefVal);
              }
            } catch {}
          }
        }
      } catch {}
      if (mounted) setIsLoaded(true);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        explicitSignOutRef.current = false;
        cachedTokenRef.current = session.access_token;
        setSpUser(session.user);
        persistCachedSession(session.user, session.access_token);
        setIsLoaded(true);
      } else if (event === "SIGNED_OUT" && explicitSignOutRef.current) {
        cachedTokenRef.current = null;
        setSpUser(null);
        setIsLoaded(true);
      } else {
        // Nunca cerrar la sesión automáticamente por fallos de red o rotación de tokens en segundo plano
        setIsLoaded(true);
      }
    });

    let removeResumeListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const stateListenerPromise = CapApp.addListener("appStateChange", async (state) => {
        if (state.isActive && !explicitSignOutRef.current) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              cachedTokenRef.current = session.access_token;
              setSpUser(session.user);
              persistCachedSession(session.user, session.access_token);
            } else {
              const { data: refreshed } = await supabase.auth.refreshSession();
              if (refreshed?.session?.user) {
                cachedTokenRef.current = refreshed.session.access_token;
                setSpUser(refreshed.session.user);
                persistCachedSession(refreshed.session.user, refreshed.session.access_token);
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
      mounted = false;
      subscription.unsubscribe();
      if (removeResumeListener) removeResumeListener();
    };
  }, []);

  const user = useMemo<FirebaseUser | null>(() => {
    if (!spUser) return null;
    const customLocalName = typeof window !== 'undefined' ? localStorage.getItem("ya_voy_real_name") : null;
    const finalFullName = customLocalName || spUser.user_metadata?.custom_name || spUser.user_metadata?.full_name || spUser.email?.split("@")[0] || null;
    return {
      fullName: finalFullName,
      firstName: finalFullName ? finalFullName.split(" ")[0] : null,
      imageUrl: spUser.user_metadata?.avatar_url || spUser.user_metadata?.picture || spUser.user_metadata?.photo_url || null,
      primaryEmailAddress: spUser.email ? { emailAddress: spUser.email } : null,
    };
  }, [spUser?.id, spUser?.email, spUser?.user_metadata]);

  return {
    isLoaded,
    isSignedIn: !!spUser,
    userId: spUser?.id ?? null,
    getToken: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          cachedTokenRef.current = session.access_token;
          persistCachedSession(session.user, session.access_token);
          return session.access_token;
        }
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session?.access_token) {
          cachedTokenRef.current = refreshed.session.access_token;
          persistCachedSession(refreshed.session.user, refreshed.session.access_token);
          return refreshed.session.access_token;
        }
      } catch {}
      return cachedTokenRef.current || getInitialCachedUser().accessToken || null;
    },
    user,
    signOut: async () => {
      explicitSignOutRef.current = true;
      cachedTokenRef.current = null;
      clearCachedSession();
      setSpUser(null);
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    },
  };
}
