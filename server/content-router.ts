import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { events, siteContent } from "../db/schema";

const TEMA_KEY = "tema";
const DEFAULT_TEMA = {
  title: "In cammino verso la luce",
  tag: "Un anno per crescere insieme: fede vissuta, amicizia autentica, servizio concreto.",
  body: "",
};

// Locandina della home: può essere un percorso in assets/ oppure una data URL
// (immagine caricata dal Direttore GA, compressa lato client e salvata nel DB).
// Stringa vuota = locandina nascosta.
const POSTER_KEY = "home_poster";
const DEFAULT_POSTER = "assets/appuntamenti_ottobre.jpg";
const MAX_POSTER_CHARS = 6_000_000; // ~4,5 MB di immagine in base64

const eventInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  time: z.string().max(5).default(""),
  title: z.string().min(1, "Titolo obbligatorio").max(255),
  cat: z.enum(["spiritualita", "natura", "musica", "comunita", "formazione"]),
  desc: z.string().max(2000).default(""),
});

const temaInput = z.object({
  title: z.string().min(1).max(255),
  tag: z.string().max(500).default(""),
  body: z.string().max(10000).default(""),
});

const posterInput = z.object({
  image: z.string().max(MAX_POSTER_CHARS),
});

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
    });
    return { ok: true };
  }),

  deleteEvent: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(events).where(eq(events.id, input.id));
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

  getPoster: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, POSTER_KEY));
    if (!rows.length) return { image: DEFAULT_POSTER };
    try {
      const parsed = JSON.parse(rows[0].value) as { image?: unknown };
      return { image: typeof parsed.image === "string" ? parsed.image : DEFAULT_POSTER };
    } catch {
      return { image: DEFAULT_POSTER };
    }
  }),

  savePoster: adminQuery.input(posterInput).mutation(async ({ input }) => {
    const db = getDb();
    const value = JSON.stringify({ image: input.image });
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, POSTER_KEY));
    if (rows.length) {
      await db.update(siteContent).set({ value }).where(eq(siteContent.key, POSTER_KEY));
    } else {
      await db.insert(siteContent).values({ key: POSTER_KEY, value });
    }
    return { ok: true };
  }),
});
