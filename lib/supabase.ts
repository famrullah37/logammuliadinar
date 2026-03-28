import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingEnvError = new Error(
  "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
);

const createFallbackSupabaseClient = () => {
  const subscription = { unsubscribe: () => undefined };

  return {
    auth: {
      getSession: async () => {
        throw missingEnvError;
      },
      onAuthStateChange: () => ({
        data: { subscription },
      }),
      signOut: async () => ({ error: missingEnvError }),
      signInWithPassword: async () => ({ error: missingEnvError }),
      signUp: async () => ({ error: missingEnvError }),
    },
    from: () => ({
      select: async () => ({ data: null, error: missingEnvError }),
      insert: async () => ({ error: missingEnvError }),
      update: () => ({
        eq: async () => ({ error: missingEnvError }),
      }),
      delete: () => ({
        eq: async () => ({ error: missingEnvError }),
      }),
    }),
  };
};

const client =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : createFallbackSupabaseClient();

export const supabase: any = client;
