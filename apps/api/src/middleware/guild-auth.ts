import { auth } from "@repo/auth"
import { db } from "@repo/db"
import { guild, guildMember } from "@repo/db/schema"
import { and, eq } from "drizzle-orm"
import type { Context, Next } from "hono"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppBindings } from "@/lib/types/app-types"

/**
 * Authenticates the request via better-auth session and resolves the
 * guild from the :guildSlug path parameter. Verifies the user is a
 * member of the guild.
 *
 * Sets in context:
 * - user: The authenticated user
 * - session: The session object
 * - guild: The resolved guild
 * - member: The user's membership in the guild
 */
export const guildAuthMiddleware = async (
  c: Context<AppBindings>,
  next: Next
) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json(
      { success: false, message: "Unauthorized" },
      HttpStatusCodes.UNAUTHORIZED
    )
  }

  const guildSlug = c.req.param("guildSlug")

  const guildRecord = await db
    .select()
    .from(guild)
    .where(eq(guild.slug, guildSlug))
    .limit(1)
    .then((rows) => rows[0])

  if (!guildRecord) {
    return c.json(
      { success: false, message: "Guild not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const memberRecord = await db
    .select()
    .from(guildMember)
    .where(
      and(
        eq(guildMember.userId, session.user.id),
        eq(guildMember.guildId, guildRecord.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!memberRecord) {
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  c.set("user", session.user)
  c.set("session", session.session)
  c.set("guild", guildRecord)
  c.set("member", memberRecord)

  await next()
}
