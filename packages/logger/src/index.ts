import pino from "pino"
import pretty from "pino-pretty"
import { getAllContext } from "./context.js"

const NODE_ENV = process.env.NODE_ENV ?? "development"
const isProd = NODE_ENV === "production"
const APP_VERSION = process.env.APP_VERSION ?? "dev"
const LOG_LEVEL = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug")

/**
 * Creates a named Pino logger.
 *
 * - Production: structured JSON to stdout. `level`/`time`/`service`/`env`/
 *   `version` are shaped to match what Datadog and Better Stack expect
 *   out-of-the-box, so a platform log drain (Railway/Fly/Vercel/etc.) is
 *   the only thing needed to ship logs — no SDK transports in-process.
 * - Development: pino-pretty stream with cleaner-than-default formatting
 *   (ISO-ish time, named prefix, hidden pid/hostname noise).
 *
 * Every log line picks up any `LogContext` currently active in
 * `AsyncLocalStorage` via Pino's `mixin` — so `requestId`, `userId`,
 * `trace_id`, etc. get attached automatically once a middleware has
 * pushed them into scope.
 */
export function createLogger(name: string): pino.Logger {
  const options: pino.LoggerOptions = {
    name,
    level: LOG_LEVEL,
    // Both Datadog and Better Stack prefer the string label (`"info"`) over
    // Pino's numeric default (`30`); their pipelines parse the field directly.
    formatters: {
      level: (label) => ({ level: label }),
    },
    // ISO 8601 timestamps — both vendors auto-detect this format.
    timestamp: pino.stdTimeFunctions.isoTime,
    // Canonical attributes for both Datadog and Better Stack. Attaching them
    // on every line means the drain side doesn't need any remapping config.
    base: {
      service: name,
      env: NODE_ENV,
      version: APP_VERSION,
    },
    mixin: getAllContext,
    redact: {
      paths: [
        "req.headers.cookie",
        "req.headers.authorization",
        "res.headers['set-cookie']",
        "user.email",
        "*.user.email",
        "password",
        "*.password",
        "token",
        "*.token",
        "apiKey",
        "*.apiKey",
      ],
      remove: true,
    },
  }

  if (isProd) return pino(options)

  // Dev: pretty-print as an in-process stream (simpler than worker transport;
  // good enough for terminal scanning). The `ignore` list hides routing
  // fields that are either redundant with the message text (`method`/`path`
  // are in `GET /foo 200`-style request lines) or platform noise
  // (`pid`/`hostname`/`service`/`env`/`version`). They remain in the log
  // record, so production JSON still carries them for Datadog/Better Stack.
  const stream = pretty({
    colorize: true,
    translateTime: "HH:MM:ss.l",
    ignore: [
      "pid",
      "hostname",
      "service",
      "env",
      "version",
      "requestId",
      "reqId",
      "method",
      "path",
    ].join(","),
    singleLine: false,
    errorLikeObjectKeys: ["err", "error"],
  })
  return pino(options, stream)
}

export type Logger = pino.Logger
export {
  enterContext,
  getAllContext,
  type LogContext,
  setContext,
  withContext,
} from "./context.js"
