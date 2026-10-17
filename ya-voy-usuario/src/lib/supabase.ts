import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const CapacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window !== 'undefined') {
        const localVal = localStorage.getItem(key);
        if (localVal !== null) {
          Preferences.set({ key, value: localVal }).catch(() => {});
          return localVal;
        }
      }
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined) {
        if (typeof window !== 'undefined') {
          try { localStorage.setItem(key, value); } catch {}
        }
        return value;
      }
    } catch {}
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(key, value); } catch {}
      }
      await Preferences.set({ key, value });
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(key); } catch {}
      }
      await Preferences.remove({ key });
    } catch {}
  },
};

const supabaseUrl = 'https://qqwpfypjwdetljyzkogo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxd3BmeXBqd2RldGxqeXprb2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MjA0NzIsImV4cCI6MjEwNzA5NjQ3Mn0.kPKaCRCLb9ounPF7_lcwJxIjXule7gUocPvprySL3Bs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CapacitorStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

