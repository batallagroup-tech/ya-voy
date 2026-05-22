const noOp: any = (..._: any[]) => Promise.resolve({ data: [], error: null });
const chainObj: any = new Proxy({}, { get: (_,__) => (...a: any[]) => chainObj });
export const supabase = {
  from: (_: string) => chainObj,
  storage: { from: (_: string) => ({
    upload: async (...a: any[]) => ({ data: null, error: null }),
    getPublicUrl: (_: string) => ({ data: { publicUrl: "" } }),
    remove: async (...a: any[]) => ({ data: null, error: null }),
  })},
  auth: {
    getUser:    async () => ({ data: { user: null },    error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut:    async () => ({ error: null }),
    signUp:     async (...a: any[]) => ({ data: { user: null }, error: null }),
    signInWithPassword: async (...a: any[]) => ({ data: { user: null }, error: null }),
    onAuthStateChange: (_: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: async (...a: any[]) => ({ data: { user: null }, error: null }),
  },
};
export default supabase;