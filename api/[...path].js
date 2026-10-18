// Funzione serverless di Vercel.
// api/server.mjs è il backend completo (Hono + tRPC + Drizzle) già bundlato —
// rigenerarlo con: node scripts/build-server.mjs
import { handle } from "hono/vercel";
import app from "./server.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

export default handle(app);
