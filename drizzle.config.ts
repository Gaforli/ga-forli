import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// drizzle-kit (push/migrate) gira come processo persistente:
// usa la DIRECT_URL (session pooler, porta 5432) se disponibile,
// altrimenti ricade su DATABASE_URL.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
