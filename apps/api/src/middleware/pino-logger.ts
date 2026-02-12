import { randomUUID } from "node:crypto"
import { pinoLogger } from "hono-pino"
import pino from "pino"
import pretty from "pino-pretty"

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug")

export function pinoLoggerMiddleware() {
  return pinoLogger({
    pino: pino(
      {
        level,
        redact: {
          paths: [
            "req.headers.cookie",
            "req.headers.authorization",
            "res.headers['set-cookie']",
          ],
          remove: true,
        },
      },
      process.env.NODE_ENV === "production" ? undefined : pretty()
    ),
    http: {
      reqId: () => randomUUID(),
    },
  })
}
