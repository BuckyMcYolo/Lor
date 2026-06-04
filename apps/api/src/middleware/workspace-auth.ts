import { auth } from "@repo/auth"
import { db } from "@repo/db"
import { workspace, workspaceMember } from "@repo/db/schema"
import { setContext } from "@repo/logger"
import { and, eq } from "drizzle-orm"
import type { Context, Next } from "hono"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppBindings } from "@/lib/types/app-types"

/**
 * Authenticates the request via better-auth session and resolves the
 * workspace from the :workspaceSlug path parameter. Verifies the user is a
 * member of the workspace.
 *
 * Sets in context:
 * - user: The authenticated user
 * - session: The session object
 * - workspace: The resolved workspace
 * - member: The user's membership in the workspace
 */
export const workspaceAuthMiddleware = async (
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

  const workspaceSlug = c.req.param("workspaceSlug")

  const workspaceRecord = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, workspaceSlug))
    .limit(1)
    .then((rows) => rows[0])

  if (!workspaceRecord) {
    return c.json(
      { success: false, message: "Workspace not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const memberRecord = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, session.user.id),
        eq(workspaceMember.workspaceId, workspaceRecord.id)
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
  c.set("workspace", workspaceRecord)
  c.set("member", memberRecord)
  setContext({
    userId: session.user.id,
    workspaceId: workspaceRecord.id,
  })

  await next()
}
