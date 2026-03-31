import { serve } from "@hono/node-server"
import { env } from "@repo/env/server"
import app from "@/app"
import { logger } from "@/lib/logger"

logger.info(`API server running on port ${env.PORT}`)
serve({ fetch: app.fetch, port: env.PORT })
