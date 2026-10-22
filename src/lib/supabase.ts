import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client Supabase Auth per la pagina Preghiere.
// Le chiavi pubbliche (URL + anon key) vengono iniettate al build da Vite
// (variabili VITE_* impostate su Vercel). Se mancano, il login è disattivato.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!client) client = createClient(url, anon);
  return client;
}
