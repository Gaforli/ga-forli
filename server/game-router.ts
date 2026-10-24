import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { gameIdentities, gameRuns, gameSessions } from "@db/schema";
import { TOWER_CONFIG_VERSION, normalizeNickname, replayTower, romeWeekStart, validNickname } from "@contracts/tower-game";
import { getDb } from "./queries/connection";
import { createRouter, publicQuery } from "./middleware";
import type { TrpcContext } from "./context";

const COOKIE = "ga_tower_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function cookieIdentity(ctx: TrpcContext) {
  const cookies = ctx.req.headers.get("cookie") ?? "";
  const match = cookies.split(/;\s*/).find((v) => v.startsWith(COOKIE + "="));
  const id = match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : "";
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

async function ensureIdentity(ctx: TrpcContext) {
  let id = cookieIdentity(ctx);
  const db = getDb();
  if (id) {
    const rows = await db.select({ id: gameIdentities.id }).from(gameIdentities).where(eq(gameIdentities.id, id)).limit(1);
    if (rows.length) return id;
  }
  id = randomUUID();
  await db.insert(gameIdentities).values({ id });
  ctx.resHeaders.append("Set-Cookie", `${COOKIE}=${id}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  return id;
}

type RunRow = typeof gameRuns.$inferSelect;
function bestRuns(rows: RunRow[]) {
  const best = new Map<string, RunRow>();
  for (const row of rows) {
    const old = best.get(row.identityId);
    if (!old || row.score > old.score || (row.score === old.score && (row.perfects > old.perfects || (row.perfects === old.perfects && row.createdAt < old.createdAt)))) best.set(row.identityId, row);
  }
  return [...best.values()].sort((a, b) => b.score - a.score || b.perfects - a.perfects || a.createdAt.getTime() - b.createdAt.getTime());
}

async function leaderboard(scope: "all" | "week", identityId: string | null) {
  const db = getDb();
  const rows = scope === "week"
    ? await db.select().from(gameRuns).where(gte(gameRuns.createdAt, romeWeekStart(new Date())))
    : await db.select().from(gameRuns);
  const ranked = bestRuns(rows);
  const top = ranked.slice(0, 20).map((r, i) => ({ rank: i + 1, nickname: r.nickname, score: r.score, perfects: r.perfects, achievedAt: r.createdAt, mine: r.identityId === identityId }));
  const index = identityId ? ranked.findIndex((r) => r.identityId === identityId) : -1;
  const mine = index >= 0 ? { rank: index + 1, nickname: ranked[index].nickname, score: ranked[index].score, perfects: ranked[index].perfects, achievedAt: ranked[index].createdAt, mine: true } : null;
  return { scope, top, mine, weekStart: romeWeekStart(new Date()) };
}

const commandSchema = z.object({ tick: z.number().int().positive() });
const submitSchema = z.object({
  sessionId: z.string().uuid(),
  nickname: z.string().min(1).max(80),
  commands: z.array(commandSchema).max(1000),
  ended: z.literal(true),
});

export const gameRouter = createRouter({
  champion: publicQuery.query(async () => {
    const rows = await getDb().select().from(gameRuns).orderBy(desc(gameRuns.createdAt));
    return bestRuns(rows)[0] ? (({ nickname, score, perfects, createdAt }) => ({ nickname, score, perfects, achievedAt: createdAt }))(bestRuns(rows)[0]) : null;
  }),

  leaderboard: publicQuery.input(z.object({ scope: z.enum(["all", "week"]) })).query(({ ctx, input }) => leaderboard(input.scope, cookieIdentity(ctx))),

  startSession: publicQuery.mutation(async ({ ctx }) => {
    const identityId = await ensureIdentity(ctx);
    const db = getDb();
    const recent = await db.select({ count: sql<number>`count(*)` }).from(gameSessions).where(and(eq(gameSessions.identityId, identityId), gte(gameSessions.createdAt, new Date(Date.now() - 60_000))));
    if (Number(recent[0]?.count ?? 0) >= 8) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Troppe partite in pochi secondi. Attendi un minuto e riprova." });
    const id = randomUUID();
    await db.insert(gameSessions).values({ id, identityId, configVersion: TOWER_CONFIG_VERSION, expiresAt: new Date(Date.now() + 30 * 60_000) });
    return { sessionId: id, configVersion: TOWER_CONFIG_VERSION };
  }),

  submitRun: publicQuery.input(submitSchema).mutation(async ({ ctx, input }) => {
    const identityId = await ensureIdentity(ctx);
    const nickname = normalizeNickname(input.nickname);
    if (!validNickname(nickname)) throw new TRPCError({ code: "BAD_REQUEST", message: "Usa da 2 a 20 caratteri: lettere, numeri, spazi, apostrofi, punti, trattini o _." });
    const db = getDb();
    const existing = await db.select().from(gameRuns).where(eq(gameRuns.sessionId, input.sessionId)).limit(1);
    if (existing.length) {
      if (existing[0].identityId !== identityId) throw new TRPCError({ code: "FORBIDDEN" });
      return { saved: true as const, duplicate: true, runId: existing[0].id, score: existing[0].score, perfects: existing[0].perfects, newAbsoluteRecord: false };
    }
    const sessions = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId)).limit(1);
    const session = sessions[0];
    if (!session || session.identityId !== identityId) throw new TRPCError({ code: "FORBIDDEN", message: "Sessione non valida." });
    if (session.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "La sessione è scaduta. Gioca una nuova partita." });
    if (session.configVersion !== TOWER_CONFIG_VERSION) throw new TRPCError({ code: "BAD_REQUEST", message: "La configurazione della partita non è più valida." });
    const recent = await db.select({ count: sql<number>`count(*)` }).from(gameRuns).where(and(eq(gameRuns.identityId, identityId), gte(gameRuns.createdAt, new Date(Date.now() - 60 * 60_000))));
    if (Number(recent[0]?.count ?? 0) >= 30) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Limite di salvataggi raggiunto. Riprova più tardi." });

    let replayed;
    try { replayed = replayTower(input.commands); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Partita non valida" }); }
    if (!replayed.state.over || replayed.state.score < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "La partita deve terminare dopo almeno un piano." });

    const before = bestRuns(await db.select().from(gameRuns))[0];
    const runId = randomUUID();
    try {
      await db.insert(gameRuns).values({ id: runId, sessionId: input.sessionId, identityId, nickname, score: replayed.state.score, perfects: replayed.state.perfects, ticks: replayed.state.tick, configVersion: session.configVersion });
    } catch (error) {
      const duplicate = await db.select().from(gameRuns).where(eq(gameRuns.sessionId, input.sessionId)).limit(1);
      if (!duplicate.length || duplicate[0].identityId !== identityId) throw error;
      return { saved: true as const, duplicate: true, runId: duplicate[0].id, score: duplicate[0].score, perfects: duplicate[0].perfects, newAbsoluteRecord: false };
    }
    const isRecord = !before || replayed.state.score > before.score || (replayed.state.score === before.score && replayed.state.perfects > before.perfects);
    return { saved: true as const, duplicate: false, runId, score: replayed.state.score, perfects: replayed.state.perfects, newAbsoluteRecord: isRecord };
  }),
});
