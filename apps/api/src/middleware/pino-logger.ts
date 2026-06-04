import { pinoLogger } from "hono-pino"
import { logger } from "@/lib/logger"

const isProd = process.env.NODE_ENV === "production"

export function pinoLoggerMiddleware() {
  return pinoLogger({
    pino: logger,
    http: {
      // In dev: one-liner per request — `GET /v1/dms 200 (542ms)`.
      //   Status + method + path + responseTime is all you want while scanning
      //   the terminal; userId/requestId already ride on ALS context if a
      //   handler emits its own logs.
      // In prod: leave the defaults (full req/res blob with headers) so the
      //   logging provider can index and reconstruct request traces.
      ...(isProd
        ? {}
        : {
            onReqMessage: false,
            // Drop the default `req` blob (url/method/headers). They'd
            // otherwise persist on the request-scoped child logger and
            // show up on the response log too.
            onReqBindings: () => ({}),
            onResBindings: () => ({}),
            onResMessage: (c) =>
              `${c.req.method} ${c.req.path} ${c.res.status}`,
            // 4xx → warn, 5xx → error, everything else stays info.
            onResLevel: (c) => {
              if (c.res.status >= 500) return "error"
              if (c.res.status >= 400) return "warn"
              return "info"
            },
          }),
    },
  })
}
