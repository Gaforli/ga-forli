// Funzione serverless di Vercel — Web API style (Request → Response).
// api/server.mjs è il backend completo (Hono + tRPC + Drizzle) già bundlato.
// Rigenerarlo con: node scripts/build-server.mjs
import app from "./server.mjs";

const handler = (request) => app.fetch(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;

export const runtime = "nodejs";
export const maxDuration = 30;
