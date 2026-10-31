import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const eventCatEnum = pgEnum("event_cat", [
  "spiritualita",
  "natura",
  "musica",
  "comunita",
  "formazione",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  time: varchar("time", { length: 5 }).default("").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  cat: eventCatEnum("cat").notNull(),
  desc: text("desc"),
  image: text("image").default(""),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type AppEvent = typeof events.$inferSelect;
export type InsertAppEvent = typeof events.$inferInsert;

// Copia storica della locandina e dei dettagli dell'evento. L'id dell'evento
// resta solo come riferimento logico: eliminare l'evento non cancella l'archivio.
export const posterArchive = pgTable("poster_archive", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  archiveMonth: varchar("archive_month", { length: 7 }).notNull(),
  eventDate: varchar("event_date", { length: 10 }).notNull(),
  eventTime: varchar("event_time", { length: 5 }).default("").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  cat: eventCatEnum("cat").notNull(),
  desc: text("desc"),
  image: text("image").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("poster_archive_event_unique").on(table.eventId),
  index("poster_archive_month_idx").on(table.archiveMonth),
]);

export type PosterArchive = typeof posterArchive.$inferSelect;

export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type SiteContent = typeof siteContent.$inferSelect;

export const adminAccounts = pgTable("admin_accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type AdminAccount = typeof adminAccounts.$inferSelect;

export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull().default(""),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  prayed: integer("prayed").notNull().default(0),
  authorName: varchar("author_name", { length: 255 }).default(""),
  color: varchar("color", { length: 7 }).notNull().default("#FFF3B8"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type PrayerRequest = typeof prayerRequests.$inferSelect;

export const gameIdentities = pgTable("game_identities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const gameSessions = pgTable("game_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identityId: varchar("identity_id", { length: 36 }).notNull(),
  configVersion: integer("config_version").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
}, (table) => [
  index("game_sessions_identity_created_idx").on(table.identityId, table.createdAt),
]);

export const gameRuns = pgTable("game_runs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  identityId: varchar("identity_id", { length: 36 }).notNull(),
  nickname: varchar("nickname", { length: 20 }).notNull(),
  score: integer("score").notNull(),
  perfects: integer("perfects").notNull(),
  ticks: integer("ticks").notNull(),
  configVersion: integer("config_version").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("game_runs_session_unique").on(table.sessionId),
  index("game_runs_identity_idx").on(table.identityId),
  index("game_runs_created_idx").on(table.createdAt),
  index("game_runs_rank_idx").on(table.score, table.perfects, table.createdAt),
]);

export type GameRun = typeof gameRuns.$inferSelect;

export const gratitudeKindEnum = pgEnum("gratitude_kind", ["annual", "special"]);
export const gratitudeStatusEnum = pgEnum("gratitude_status", [
  "pending",
  "approved",
  "discarded",
]);

export const gratitudeCollections = pgTable("gratitude_collections", {
  id: serial("id").primaryKey(),
  year: integer("year"), // NULL solo per raccolte straordinarie
  label: varchar("label", { length: 120 }).notNull(),
  kind: gratitudeKindEnum("kind").default("annual").notNull(),
  introMessage: text("intro_message").notNull(),
  isOpen: integer("is_open").default(0).notNull(),
  openedAt: timestamp("opened_at", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("gratitude_collections_label_unique").on(table.label),
  uniqueIndex("gratitude_collections_annual_year_unique").on(table.kind, table.year),
]);

export type GratitudeCollection = typeof gratitudeCollections.$inferSelect;

export const gratitudeNotes = pgTable("gratitude_notes", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  clientToken: varchar("client_token", { length: 64 }).notNull(),
  title: varchar("title", { length: 60 }).notNull().default(""),
  body: text("body").notNull(),
  signature: varchar("signature", { length: 30 }),
  color: varchar("color", { length: 7 }).notNull().default("#F5DFA7"),
  status: gratitudeStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  moderatedAt: timestamp("moderated_at", { mode: "date" }),
}, (table) => [
  uniqueIndex("gratitude_notes_token_unique").on(table.clientToken),
  index("gratitude_notes_collection_status_idx").on(table.collectionId, table.status),
]);

export type GratitudeNote = typeof gratitudeNotes.$inferSelect;
