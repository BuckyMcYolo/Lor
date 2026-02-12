import type { ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

const onError: ErrorHandler = (err, c) => {
  const currentStatus =
    "status" in err && typeof err.status === "number" ? err.status : 500
  const statusCode =
    currentStatus >= 400
      ? (currentStatus as ContentfulStatusCode)
      : (500 as const)

  return c.json(
    {
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    },
    statusCode
  )
}

export default onError
