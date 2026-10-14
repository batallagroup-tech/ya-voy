import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const CapacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null) return value;
      if (typeof window !== 'undefined') {
        const localVal = localStorage.getItem(key);
        if (localVal) {
          await Preferences.set({ key, value: localVal });
          return localVal;
        }
      }
    } catch {}
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Preferences.set({ key, value });
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await Preferences.remove({ key });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
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

