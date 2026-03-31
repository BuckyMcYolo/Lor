import { randomUUID } from "node:crypto"
import { pinoLogger } from "hono-pino"
import { logger } from "@/lib/logger"

export function pinoLoggerMiddleware() {
  return pinoLogger({
    pino: logger,
    http: {
      reqId: () => randomUUID(),
    },
  })
}
