import type { Context, Next } from "hono"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { getRedisClient } from "@/lib/redis"
import type { AppBindings } from "@/lib/types/app-types"

const WINDOW_SECONDS = 60
const KEY_TTL_SECONDS = 90

interface RateLimitConfig {
  /** Requests per window */
  max: number
  /** Window size in seconds (default 60) */
  window?: number
  /** Key prefix for Redis */
  prefix: string
  /** Extract the identifier from the request (default: IP address) */
  keyExtractor?: (c: Context<AppBindings>) => string
}

function getIp(c: Context<AppBindings>): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  )
}

function getWindowNumber(windowSeconds: number): number {
  return Math.floor(Date.now() / (windowSeconds * 1000))
}

function getRetryAfterSeconds(windowSeconds: number): number {
  const elapsed = Math.floor(Date.now() / 1000) % windowSeconds
  return Math.max(1, windowSeconds - elapsed)
}

export function rateLimiter(config: RateLimitConfig) {
  const windowSeconds = config.window ?? WINDOW_SECONDS

  return async (c: Context<AppBindings>, next: Next) => {
    const redis = await getRedisClient()
    const identifier = config.keyExtractor ? config.keyExtractor(c) : getIp(c)

    const windowNum = getWindowNumber(windowSeconds)
    const key = `ratelimit:api:${config.prefix}:${identifier}:${windowNum}`

    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(
        key,
        config.window ? config.window + 30 : KEY_TTL_SECONDS
      )
    }

    c.header("X-RateLimit-Limit", String(config.max))
    c.header("X-RateLimit-Remaining", String(Math.max(0, config.max - count)))

    if (count > config.max) {
      const retryAfter = getRetryAfterSeconds(windowSeconds)
      c.header("Retry-After", String(retryAfter))
      c.header("X-RateLimit-Remaining", "0")
      return c.json(
        {
          success: false,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds`,
        },
        HttpStatusCodes.TOO_MANY_REQUESTS
      )
    }

    await next()
  }
}

/** Global rate limit: 100 requests/min per IP */
export const globalRateLimit = rateLimiter({
  prefix: "global",
  max: 100,
})

/** Stricter rate limit for write operations: 30 requests/min per user */
export const writeRateLimit = rateLimiter({
  prefix: "write",
  max: 30,
  keyExtractor: (c) => c.get("user")?.id ?? getIp(c),
})
