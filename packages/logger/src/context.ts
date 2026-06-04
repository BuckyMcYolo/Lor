import { AsyncLocalStorage } from "node:async_hooks"

/**
 * Per-operation log context. Fields here are merged into every log line
 * emitted while inside a `withContext` scope, via the Pino `mixin` in
 * `createLogger`. Field names follow OpenTelemetry-style snake_case for
 * `trace_id` / `span_id` so the same JSON works with both Datadog and
 * Better Stack log pipelines without remapping.
 */
export interface LogContext {
  requestId?: string
  method?: string
  path?: string
  userId?: string
  workspaceId?: string
  channelId?: string
  socketId?: string
  jobId?: string
  jobName?: string
  trace_id?: string
  span_id?: string
  [key: string]: unknown
}

const storage = new AsyncLocalStorage<LogContext>()

export function getAllContext(): LogContext {
  return storage.getStore() ?? {}
}

/** Mutate the current scope's context. No-op if called outside `withContext`. */
export function setContext(partial: LogContext): void {
  const store = storage.getStore()
  if (store) Object.assign(store, partial)
}

/** Run `fn` inside a new ALS scope seeded with `context` (merged with the parent). */
export function withContext<T>(context: LogContext, fn: () => T): T {
  const parent = storage.getStore() ?? {}
  return storage.run({ ...parent, ...context }, fn)
}

/** Set ALS scope for the rest of the current async chain. Use from Socket.IO middleware. */
export function enterContext(context: LogContext): void {
  storage.enterWith({ ...context })
}
