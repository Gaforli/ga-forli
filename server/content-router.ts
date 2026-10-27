import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { events, siteContent, prayerRequests, posterArchive } from "../db/schema";
import { env } from "./lib/env";

const TEMA_KEY = "tema";
const DEFAULT_TEMA = {
  title: "In cammino verso la luce",
  tag: "Un anno per crescere insieme: fede vissuta, amicizia autentica, servizio concreto.",
  body: "",
};

// Locandine della home: array ordinato di immagini (data URL o percorso assets/).
// Il Direttore GA le carica e le riordina dall'area riservata.
// Array vuoto = sezione nascosta.
const POSTERS_KEY = "home_posters";
const DEFAULT_POSTERS = ["assets/appuntamenti_ottobre.jpg"];

// Locandina "Attività del mese": singola immagine mostrata nella pagina dedicata.
const MONTHLY_KEY = "monthly_poster";
const MAX_POSTER_CHARS = 6_000_000; // ~4,5 MB di immagine in base64

// Card "I nostri valori" della home: titoli e descrizioni delle tre voci,
// per lingua (it/en/es/pt). Salvate su site_content; i campi vuoti
// ricadono sui testi predefiniti delle traduzioni del sito.
const VALUES_KEY = "home_values";
const VALUES_LANGS = ["it", "en", "es", "pt"] as const;
type ValuesTexts = Record<string, { v1_t: string; v1_d: string; v2_t: string; v2_d: string; v3_t: string; v3_d: string }>;

const eventInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  time: z.string().max(5).default(""),
  title: z.string().min(1, "Titolo obbligatorio").max(255),
  cat: z.enum(["spiritualita", "natura", "musica", "comunita", "formazione"]),
  desc: z.string().max(2000).default(""),
  image: z.string().max(MAX_POSTER_CHARS).default(""),
});

const temaInput = z.object({
  title: z.string().min(1).max(255),
  tag: z.string().max(500).default(""),
  body: z.string().max(10000).default(""),
});

const postersInput = z.object({
  images: z.array(z.string().max(MAX_POSTER_CHARS)).max(10),
});

const monthlyInput = z.object({
  image: z.string().max(MAX_POSTER_CHARS),
});

const valueItemInput = z.object({
  v1_t: z.string().max(120).default(""),
  v1_d: z.string().max(500).default(""),
  v2_t: z.string().max(120).default(""),
  v2_d: z.string().max(500).default(""),
  v3_t: z.string().max(120).default(""),
  v3_d: z.string().max(500).default(""),
});

const valuesInput = z.object({
  values: z.record(z.enum(VALUES_LANGS), valueItemInput),
});

const archiveMonthInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mese non valido");

// ── Richieste di preghiera ──
const POSTIT_COLORS = ["#FFF3B8", "#DDE8C8", "#FFD9CF", "#FFE9B0", "#E3F0DA", "#FADCD5"] as const;
const prayerInput = z.object({
  title: z.string().min(1, "Titolo obbligatorio").max(120),
  body: z.string().min(1, "Scrivi la richiesta").max(1000),
  name: z.string().max(120).default(""),
  anonymous: z.boolean().default(false),
  color: z.enum(POSTIT_COLORS).default(POSTIT_COLORS[0]),
}).refine((v) => v.anonymous || v.name.trim().length > 0, {
  message: "Inserisci il tuo nome oppure seleziona Resta anonimo",
});

// Invia la mail di notifica al Direttore GA tramite Resend (best-effort).
async function notifyNewPrayer(title: string, body: string, author: string) {
  if (!env.resendApiKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "GA Forlì <onboarding@resend.dev>",
        to: [env.prayerNotifyEmail],
        subject: `Nuova richiesta di preghiera: ${title}`,
        text: `${author} ha inviato una nuova richiesta di preghiera.\n\nTitolo: ${title}\n\n${body}\n\nPer approvarla o eliminarla apri il sito gaforli.vercel.app → menu → Direttore GA → scheda Preghiere.`,
      }),
    });
  } catch {
    // la richiesta resta salvata anche se la mail fallisce
  }
}

export const contentRouter = createRouter({
  listEvents: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(events).orderBy(asc(events.date), asc(events.time));
    return rows.map((r) => ({
      id: Number(r.id),
      date: r.date,
      time: r.time,
      title: r.title,
      cat: r.cat,
      desc: r.desc ?? "",
      image: r.image ?? "",
    }));
  }),

  addEvent: adminQuery.input(eventInput).mutation(async ({ input }) => {
    const db = getDb();
    await db.insert(events).values({
      date: input.date,
      time: input.time,
      title: input.title,
      cat: input.cat,
      desc: input.desc,
      image: input.image,
    });
    return { ok: true };
  }),

  updateEvent: adminQuery
    .input(eventInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...values } = input;
      const existing = await db.select({ id: events.id }).from(events).where(eq(events.id, id)).limit(1);
      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato" });
      }
      await db.update(events).set(values).where(eq(events.id, id));
      return { ok: true };
    }),

  deleteEvent: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(events).where(eq(events.id, input.id));
      return { ok: true };
    }),

  // ── Archivio Locandine: copia storica collegata all'evento di origine ──
  listPosterArchive: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(posterArchive).orderBy(
      desc(posterArchive.archiveMonth),
      desc(posterArchive.eventDate),
      desc(posterArchive.eventTime),
      desc(posterArchive.id),
    );
    return rows.map((r) => ({
      id: Number(r.id),
      eventId: Number(r.eventId),
      archiveMonth: r.archiveMonth,
      date: r.eventDate,
      time: r.eventTime,
      title: r.title,
      cat: r.cat,
      desc: r.desc ?? "",
      image: r.image,
    }));
  }),

  archiveEventPoster: adminQuery
    .input(z.object({
      eventId: z.number().int().positive(),
      month: archiveMonthInput,
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      const event = rows[0];
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato" });
      }
      if (!event.image) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Aggiungi prima una locandina personalizzata all'evento",
        });
      }

      const values = {
        eventId: Number(event.id),
        archiveMonth: input.month,
        eventDate: event.date,
        eventTime: event.time,
        title: event.title,
        cat: event.cat,
        desc: event.desc ?? "",
        image: event.image,
        updatedAt: new Date(),
      };
      await db.insert(posterArchive).values(values).onConflictDoUpdate({
        target: posterArchive.eventId,
        set: {
          archiveMonth: values.archiveMonth,
          eventDate: values.eventDate,
          eventTime: values.eventTime,
          title: values.title,
          cat: values.cat,
          desc: values.desc,
          image: values.image,
          updatedAt: values.updatedAt,
        },
      });
      return { ok: true };
    }),

  moveArchivedPoster: adminQuery
    .input(z.object({
      id: z.number().int().positive(),
      month: archiveMonthInput,
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select({ id: posterArchive.id }).from(posterArchive)
        .where(eq(posterArchive.id, input.id)).limit(1);
      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Locandina archiviata non trovata" });
      }
      await db.update(posterArchive)
        .set({ archiveMonth: input.month, updatedAt: new Date() })
        .where(eq(posterArchive.id, input.id));
      return { ok: true };
    }),

  removeArchivedPoster: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(posterArchive).where(eq(posterArchive.id, input.id));
      return { ok: true };
    }),

  getTema: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, TEMA_KEY));
    if (!rows.length) return DEFAULT_TEMA;
    try {
      return { ...DEFAULT_TEMA, ...JSON.parse(rows[0].value) };
    } catch {
      return DEFAULT_TEMA;
    }
  }),

  saveTema: adminQuery.input(temaInput).mutation(async ({ input }) => {
    const db = getDb();
    const value = JSON.stringify(input);
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, TEMA_KEY));
    if (rows.length) {
      await db.update(siteContent).set({ value }).where(eq(siteContent.key, TEMA_KEY));
    } else {
      await db.insert(siteContent).values({ key: TEMA_KEY, value });
    }
    return { ok: true };
  }),

  getPosters: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, POSTERS_KEY));
    if (!rows.length) return { images: DEFAULT_POSTERS };
    try {
      const parsed = JSON.parse(rows[0].value) as { images?: unknown };
      const images = Array.isArray(parsed.images) ? parsed.images.filter((i): i is string => typeof i === "string") : DEFAULT_POSTERS;
      return { images };
    } catch {
      return { images: DEFAULT_POSTERS };
    }
  }),

  savePosters: adminQuery.input(postersInput).mutation(async ({ input }) => {
    const db = getDb();
    const value = JSON.stringify({ images: input.images });
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, POSTERS_KEY));
    if (rows.length) {
      await db.update(siteContent).set({ value }).where(eq(siteContent.key, POSTERS_KEY));
    } else {
      await db.insert(siteContent).values({ key: POSTERS_KEY, value });
    }
    return { ok: true };
  }),

  getMonthly: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, MONTHLY_KEY));
    if (!rows.length) return { image: "" };
    try {
      const parsed = JSON.parse(rows[0].value) as { image?: unknown };
      return { image: typeof parsed.image === "string" ? parsed.image : "" };
    } catch {
      return { image: "" };
    }
  }),

  saveMonthly: adminQuery.input(monthlyInput).mutation(async ({ input }) => {
    const db = getDb();
    const value = JSON.stringify({ image: input.image });
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, MONTHLY_KEY));
    if (rows.length) {
      await db.update(siteContent).set({ value }).where(eq(siteContent.key, MONTHLY_KEY));
    } else {
      await db.insert(siteContent).values({ key: MONTHLY_KEY, value });
    }
    return { ok: true };
  }),

  getValues: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, VALUES_KEY));
    if (!rows.length) return { values: {} as ValuesTexts };
    try {
      const parsed = JSON.parse(rows[0].value) as { values?: unknown };
      const values: ValuesTexts = {};
      if (parsed.values && typeof parsed.values === "object") {
        for (const lang of VALUES_LANGS) {
          const item = (parsed.values as Record<string, unknown>)[lang];
          if (item && typeof item === "object") {
            const rec = item as Record<string, unknown>;
            values[lang] = {
              v1_t: typeof rec.v1_t === "string" ? rec.v1_t : "",
              v1_d: typeof rec.v1_d === "string" ? rec.v1_d : "",
              v2_t: typeof rec.v2_t === "string" ? rec.v2_t : "",
              v2_d: typeof rec.v2_d === "string" ? rec.v2_d : "",
              v3_t: typeof rec.v3_t === "string" ? rec.v3_t : "",
              v3_d: typeof rec.v3_d === "string" ? rec.v3_d : "",
            };
          }
        }
      }
      return { values };
    } catch {
      return { values: {} as ValuesTexts };
    }
  }),

  saveValues: adminQuery.input(valuesInput).mutation(async ({ input }) => {
    const db = getDb();
    const value = JSON.stringify({ values: input.values });
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, VALUES_KEY));
    if (rows.length) {
      await db.update(siteContent).set({ value }).where(eq(siteContent.key, VALUES_KEY));
    } else {
      await db.insert(siteContent).values({ key: VALUES_KEY, value });
    }
    return { ok: true };
  }),

  // ── Preghiere: bacheca pubblica ──
  listPrayers: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(prayerRequests)
      .where(eq(prayerRequests.status, "approved"))
      .orderBy(desc(prayerRequests.createdAt), desc(prayerRequests.id));
    return rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      body: r.body ?? "",
      prayed: r.prayed,
      color: r.color,
    }));
  }),

  prayFor: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(prayerRequests)
        .set({ prayed: sql`${prayerRequests.prayed} + 1` })
        .where(eq(prayerRequests.id, input.id));
      return { ok: true };
    }),

  // Invio aperto a tutti: la richiesta resta "pending" finché il Direttore GA
  // non la approva. Il nome non viene mostrato pubblicamente sulla bacheca.
  submitPrayer: publicQuery.input(prayerInput).mutation(async ({ input }) => {
    const author = input.anonymous ? "Anonimo" : input.name.trim();
    const db = getDb();
    await db.insert(prayerRequests).values({
      title: input.title.trim(),
      body: input.body.trim(),
      authorName: author,
      color: input.color,
    });
    await notifyNewPrayer(input.title.trim(), input.body.trim(), author);
    return { ok: true };
  }),

  // Moderazione (solo Direttore GA)
  listPendingPrayers: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(prayerRequests)
      .where(eq(prayerRequests.status, "pending"))
      .orderBy(desc(prayerRequests.createdAt), desc(prayerRequests.id));
    return rows.map((r) => ({ id: Number(r.id), title: r.title, body: r.body ?? "", author: r.authorName ?? "", color: r.color }));
  }),

  approvePrayer: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(prayerRequests).set({ status: "approved" }).where(eq(prayerRequests.id, input.id));
      return { ok: true };
    }),

  deletePrayer: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(prayerRequests).where(eq(prayerRequests.id, input.id));
      return { ok: true };
    }),
});
