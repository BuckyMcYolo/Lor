import type { ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { logger as fallbackLogger } from "@/lib/logger"
import type { AppBindings } from "@/lib/types/app-types"

const onError: ErrorHandler<AppBindings> = (err, c) => {
  const currentStatus =
    "status" in err && typeof err.status === "number" ? err.status : 500
  const statusCode =
    currentStatus >= 400
      ? (currentStatus as ContentfulStatusCode)
      : (500 as const)

  // Log the actual exception — otherwise a 500 only ever surfaces as the
  // pino-logger response line (`GET /foo 500`) with no message or stack.
  // `err` is run through the std error serializer (see @repo/logger), and
  // requestId/userId/workspaceId ride along from the ALS log context. Fall
  // back to the module logger if the error fires before the pino middleware.
  const log = c.var.logger ?? fallbackLogger
  log[statusCode >= 500 ? "error" : "warn"](
    { err, status: statusCode },
    `Unhandled error: ${err.message}`
  )

  return c.json(
    {
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    },
    statusCode
  )
}

export default onError
