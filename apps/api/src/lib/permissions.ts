import { auth } from "@repo/auth"
import type { statement } from "@repo/auth/permissions"
import { HTTPException } from "hono/http-exception"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"

// ── Type-Safe Permission Types ──────────────────────────────────────

export type StatementKey = keyof typeof statement

export type PermissionForStatement<T extends StatementKey> =
  (typeof statement)[T][number]

// ── Permission Check ──────────────────────────────────────

/**
 * Checks if the current user has the specified permissions in their active guild.
 * Uses better-auth's hasPermission API.
 *
 * Throws an HTTPException with 403 if the user lacks the required permissions.
 *
 * @example
 * const allowed = await checkPermission(c.req.raw.headers, "channel", ["update"])
 * if (!allowed) throw new HTTPException(403)
 */
export async function checkPermission<
  TResource extends StatementKey,
  TPermissions extends readonly PermissionForStatement<TResource>[],
>(headers: Headers, resource: TResource, permissions: TPermissions) {
  const result = await auth.api.hasPermission({
    headers,
    body: {
      permissions: {
        [resource]: [...permissions],
      },
    },
  })

  if (!result.success) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: `You do not have permission to ${permissions.join("/")} ${resource}`,
    })
  }

  return true
}
