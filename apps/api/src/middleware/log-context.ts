import { withContext } from "@repo/logger"
import type { Context, Next } from "hono"
import type { AppBindings } from "@/lib/types/app-types"

/**
 * Runs the rest of the request inside an ALS scope seeded with
 * `requestId`, `method`, and `path`. Downstream middleware (e.g.
 * `sessionAuthMiddleware`) can call `setContext({ userId })` to enrich
 * the scope further; the Pino `mixin` in `@repo/logger` picks up
 * whatever's in scope at log time.
 *
 * Must run after Hono's `requestId()` so the id is available.
 */
export async function logContextMiddleware(
  c: Context<AppBindings>,
  next: Next
) {
  const requestId = c.get("requestId")
  await withContext(
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
    },
    next
  )
}
