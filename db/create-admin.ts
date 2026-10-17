/**
 * Create or update a local admin account (Direttore GA).
 * Usage: npx tsx db/create-admin.ts <email> <password> [name]
 * The password is hashed with scrypt — it is never stored in plain text.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../server/queries/connection";
import { adminAccounts } from "./schema";
import { hashPassword } from "../server/local-auth";

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npx tsx db/create-admin.ts <email> <password> [name]");
  process.exit(1);
}

const normalized = email.trim().toLowerCase();
const passwordHash = await hashPassword(password);
const db = getDb();

const existing = await db
  .select()
  .from(adminAccounts)
  .where(eq(adminAccounts.email, normalized));

if (existing.length > 0) {
  await db
    .update(adminAccounts)
    .set({ passwordHash, name: name || existing[0].name })
    .where(eq(adminAccounts.email, normalized));
  console.log(`Updated admin account: ${normalized}`);
} else {
  await db.insert(adminAccounts).values({
    email: normalized,
    passwordHash,
    name: name || "Direttore GA",
  });
  console.log(`Created admin account: ${normalized}`);
}

process.exit(0);
