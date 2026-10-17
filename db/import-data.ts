/**
 * Importa i dati del sito (eventi, tema dell'anno, account admin)
 * dal dump JSON nel database Supabase.
 *
 * Uso:
 *   1. Crea le tabelle:  npx drizzle-kit push
 *   2. Importa i dati:   npx tsx db/import-data.ts
 *
 * Richiede DATABASE_URL nel file .env (vedi .env.example).
 * Lo script è idempotente: non crea duplicati se rilanciato.
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../server/queries/connection";
import { events, siteContent, adminAccounts } from "./schema";

type Dump = {
  events: { date: string; time: string; title: string; cat: string; desc: string; image: string }[];
  content: { key: string; value: string }[];
  admins: { email: string; passwordHash: string; name: string | null }[];
};

const dump: Dump = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "dump-gaforli.json"), "utf8"),
);

async function main() {
  const db = getDb();

  const existingEvents = await db.select().from(events);
  if (existingEvents.length === 0 && dump.events.length) {
    await db.insert(events).values(
      dump.events.map((e) => ({
        date: e.date,
        time: e.time ?? "",
        title: e.title,
        cat: e.cat as "spiritualita" | "natura" | "musica" | "comunita" | "formazione",
        desc: e.desc ?? "",
        image: e.image ?? "",
      })),
    );
    console.log(`Importati ${dump.events.length} eventi.`);
  } else {
    console.log("Eventi già presenti, salto.");
  }

  for (const c of dump.content) {
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, c.key));
    if (rows.length === 0) {
      await db.insert(siteContent).values({ key: c.key, value: c.value });
      console.log(`Contenuto "${c.key}" importato.`);
    } else {
      console.log(`Contenuto "${c.key}" già presente, salto.`);
    }
  }

  for (const a of dump.admins) {
    const rows = await db.select().from(adminAccounts).where(eq(adminAccounts.email, a.email));
    if (rows.length === 0) {
      await db.insert(adminAccounts).values({
        email: a.email,
        passwordHash: a.passwordHash,
        name: a.name,
      });
      console.log(`Account admin ${a.email} importato (password invariata).`);
    } else {
      console.log(`Account admin ${a.email} già presente, salto.`);
    }
  }

  console.log("Importazione completata.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
