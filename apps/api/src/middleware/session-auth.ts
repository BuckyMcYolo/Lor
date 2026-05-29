import { auth } from "@repo/auth"
import type { Context, Next } from "hono"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppBindings } from "@/lib/types/app-types"

/**
 * Lightweight auth middleware that only validates the session.
 * Does NOT require or resolve an active workspace.
 *
 * Use this for workspace-independent routes like DMs.
 *
 * Sets in context:
 * - user: The authenticated user
 * - session: The session object
 */
export const sessionAuthMiddleware = async (
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

  c.set("user", session.user)
  c.set("session", session.session)

  await next()
}
