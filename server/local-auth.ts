import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { adminAccounts } from "../db/schema";

type AdminAccount = typeof adminAccounts.$inferSelect;
let configuredAccount: Promise<AdminAccount | null> | null = null;
let configuredKey = "";

function scryptAsync(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) =>
      err ? reject(err) : resolve(key.toString("hex")),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = await scryptAsync(password, salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function findAdminByEmail(email: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(adminAccounts)
    .where(eq(adminAccounts.email, email));
  return rows[0] ?? null;
}

/**
 * Optional server-only admin configuration. Values never enter the frontend
 * bundle or an API response; only the scrypt hash is persisted in the database.
 */
export async function findConfiguredAdmin(email: string): Promise<AdminAccount | null> {
  const configuredEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "").trim() || "Direttore GA";
  if (!configuredEmail && !password) return findAdminByEmail(email);

  // A partial or placeholder configuration is deliberately not accepted.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) || password.length < 8 || password === "xxx") return null;
  if (configuredEmail !== email) return null;

  const key = `${configuredEmail}\0${password}\0${name}`;
  if (!configuredAccount || configuredKey !== key) {
    configuredKey = key;
    configuredAccount = (async () => {
      const existing = await findAdminByEmail(configuredEmail);
      if (existing && await verifyPassword(password, existing.passwordHash)) {
        if (existing.name === name) return existing;
        await getDb().update(adminAccounts).set({ name }).where(eq(adminAccounts.email, configuredEmail));
        return { ...existing, name };
      }
      const passwordHash = await hashPassword(password);
      if (existing) {
        await getDb().update(adminAccounts).set({ passwordHash, name }).where(eq(adminAccounts.email, configuredEmail));
      } else {
        await getDb().insert(adminAccounts).values({ email: configuredEmail, passwordHash, name });
      }
      const account = await findAdminByEmail(configuredEmail);
      if (!account) throw new Error("Configurazione amministratore non riuscita");
      return account;
    })().catch((error) => {
      configuredAccount = null;
      configuredKey = "";
      throw error;
    });
  }
  return configuredAccount;
}
