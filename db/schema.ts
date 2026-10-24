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
