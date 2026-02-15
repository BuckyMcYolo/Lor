import { auth } from "@repo/auth"
import { db } from "@repo/db"
import { guild, guildMember } from "@repo/db/schema"
import { and, eq } from "drizzle-orm"
import type { Context, Next } from "hono"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppBindings } from "@/lib/types/app-types"

/**
 * Authenticates the request via better-auth session and resolves the
 * user's active guild + membership.
 *
 * Sets in context:
 * - user: The authenticated user
 * - session: The session object
 * - guild: The user's active guild
 * - member: The user's membership in the active guild
 */
export const authMiddleware = async (c: Context<AppBindings>, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json(
      { success: false, message: "Unauthorized" },
      HttpStatusCodes.UNAUTHORIZED
    )
  }

  const activeGuildId = session.session.activeOrganizationId

  if (!activeGuildId) {
    return c.json(
      { success: false, message: "No active guild selected" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  const memberRecord = await db
    .select()
    .from(guildMember)
    .where(
      and(
        eq(guildMember.userId, session.user.id),
        eq(guildMember.guildId, activeGuildId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!memberRecord) {
    return c.json(
      { success: false, message: "You are not a member of this guild" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  const guildRecord = await db
    .select()
    .from(guild)
    .where(eq(guild.id, activeGuildId))
    .limit(1)
    .then((rows) => rows[0])

  if (!guildRecord) {
    return c.json(
      { success: false, message: "Guild not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  c.set("user", session.user)
  c.set("session", session.session)
  c.set("guild", guildRecord)
  c.set("member", memberRecord)

  await next()
}
