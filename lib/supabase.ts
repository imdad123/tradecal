import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase now issues sb_publishable_ keys. Keep the legacy anon variable
// as a fallback so existing Vercel configurations continue to work.
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && key);
export const supabase = hasSupabaseConfig ? createClient(url!, key!) : null;
