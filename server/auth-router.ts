import * as cookie from "cookie";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { signSessionToken } from "./session";
import { env } from "./lib/env";
import { upsertUser } from "./queries/users";
import { findAdminByEmail, verifyPassword } from "./local-auth";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),
  loginLocal: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const account = await findAdminByEmail(input.email.trim().toLowerCase());
      if (!account || !(await verifyPassword(input.password, account.passwordHash))) {
        return { ok: false as const };
      }
      const unionId = "local:" + account.email;
      await upsertUser({
        unionId,
        name: account.name || account.email,
        role: "admin",
        lastSignInAt: new Date(),
      });
      const token = await signSessionToken({ unionId, clientId: env.appId });
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );
      return { ok: true as const };
    }),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
