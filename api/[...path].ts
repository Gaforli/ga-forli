import { handle } from "hono/vercel";
import app from "../server/boot";

export const runtime = "nodejs";
export const maxDuration = 30;

export default handle(app);
