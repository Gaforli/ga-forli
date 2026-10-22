import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: process.env.APP_ID || "gaforli",
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  // Supabase Postgres connection string (transaction pooler, porta 6543)
  databaseUrl: required("DATABASE_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  // Supabase Auth (per il login Google/Facebook/email nella pagina Preghiere)
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  // Resend (email di notifica al Direttore GA per le nuove richieste)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  prayerNotifyEmail: process.env.PRAYER_NOTIFY_EMAIL ?? "luigifrancescasposi@gmail.com",
};
