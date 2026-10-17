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
};
