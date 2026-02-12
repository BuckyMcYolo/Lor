import { OpenAPIHono } from "@hono/zod-openapi"
import type { Schema } from "hono"
import { requestId } from "hono/request-id"
import defaultHook from "@/lib/misc/default-hook"
import type { AppBindings, AppOpenAPI } from "@/lib/types/app-types"
import notFound from "@/middleware/not-found"
import onError from "@/middleware/on-error"
import { pinoLoggerMiddleware } from "@/middleware/pino-logger"
import serveFavicon from "@/middleware/serve-favicon"

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  })
}

export default function createApp() {
  const app = createRouter()
  app.use(requestId()).use(pinoLoggerMiddleware())
  app.use(serveFavicon("⚡"))
  app.notFound(notFound)
  app.onError(onError)
  return app
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  return createApp().route("/", router)
}
