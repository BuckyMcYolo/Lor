import pino from "pino"
import pretty from "pino-pretty"

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug")

const isProd = process.env.NODE_ENV === "production"

/**
 * Creates a named Pino logger instance.
 *
 * In production: outputs structured JSON to stdout (for Railway / log drains).
 * In development: uses pino-pretty for human-readable output.
 *
 * @param name - Service identifier (e.g. "api", "realtime", "worker", "auth")
 */
export function createLogger(name: string): pino.Logger {
  return pino(
    {
      name,
      level,
      ...(isProd && {
        redact: {
          paths: [
            "req.headers.cookie",
            "req.headers.authorization",
            "res.headers['set-cookie']",
            "user.email",
            "*.user.email",
          ],
          remove: true,
        },
      }),
    },
    isProd ? undefined : pretty()
  )
}

export type Logger = pino.Logger
