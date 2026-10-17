import { getDb } from "../server/queries/connection";
import { events } from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  const existing = await db.select().from(events);
  if (existing.length === 0) {
    await db.insert(events).values([
      { date: "2026-04-26", time: "15:00", title: "Sabato al Parco Urbano", cat: "natura", desc: "Natura, condivisione e una breve meditazione insieme." },
      { date: "2026-05-03", time: "20:30", title: "Meditazione & Musica", cat: "spiritualita", desc: "Un tempo di lode, riflessione e condivisione." },
      { date: "2026-05-10", time: "17:00", title: "Incontro G.A.", cat: "comunita", desc: "Conosciamoci, parliamo, programmiamo insieme i prossimi passi." },
    ]);
    console.log("Inserted 3 starter events.");
  } else {
    console.log("Events already present, skipping.");
  }

  console.log("Done.");
  process.exit(0);
}

seed();
