import { getGuildMessageRateLimit, isGuildRole } from "@repo/auth/permissions"
import type { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient>

const WINDOW_SECONDS = 60
const KEY_TTL_SECONDS = 90

function getMessageRateLimitKey(
  guildId: string,
  userId: string,
  timestamp: number
) {
  const currentWindow = Math.floor(timestamp / (WINDOW_SECONDS * 1000))
  return `ratelimit:guild:${guildId}:user:${userId}:message:${currentWindow}`
}

function getRetryAfterSeconds(timestamp: number) {
  const elapsedSeconds = Math.floor(timestamp / 1000) % WINDOW_SECONDS
  return Math.max(1, WINDOW_SECONDS - elapsedSeconds)
}

export async function enforceGuildMessageRateLimit(
  redis: RedisClient,
  input: {
    guildId: string
    userId: string
    role: string
  }
) {
  if (!isGuildRole(input.role)) {
    throw new Error(`Unknown guild role: ${input.role}`)
  }

  const now = Date.now()
  const key = getMessageRateLimitKey(input.guildId, input.userId, now)
  const nextCount = await redis.incr(key)

  if (nextCount === 1) {
    await redis.expire(key, KEY_TTL_SECONDS)
  }

  const limit = getGuildMessageRateLimit(input.role)
  if (nextCount <= limit) return

  throw new Error(
    `Rate limit exceeded. Try again in ${getRetryAfterSeconds(now)} seconds`
  )
}
