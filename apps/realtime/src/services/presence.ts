import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import type { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient>

const MARK_USER_CONNECTED_SCRIPT = `
redis.call("SADD", KEYS[1], ARGV[1])
local socketCount = redis.call("SCARD", KEYS[1])
if socketCount == 1 then
  redis.call("SADD", KEYS[2], ARGV[2])
  return 1
end
return 0
`

const MARK_USER_DISCONNECTED_SCRIPT = `
redis.call("SREM", KEYS[1], ARGV[1])
local socketCount = redis.call("SCARD", KEYS[1])
if socketCount == 0 then
  redis.call("SREM", KEYS[2], ARGV[2])
  redis.call("DEL", KEYS[1])
  return 1
end
return 0
`

function toRedisBoolean(value: unknown) {
  return value === true || value === 1 || value === "1"
}

function userSocketsKey(userId: string) {
  return `presence:user:${userId}:sockets`
}

export async function markUserConnected(
  redis: RedisClient,
  userId: string,
  socketId: string
) {
  const result = await redis.eval(MARK_USER_CONNECTED_SCRIPT, {
    keys: [userSocketsKey(userId), PRESENCE_ONLINE_USERS_SET_KEY],
    arguments: [socketId, userId],
  })

  return { becameOnline: toRedisBoolean(result) }
}

export async function markUserDisconnected(
  redis: RedisClient,
  userId: string,
  socketId: string
) {
  const result = await redis.eval(MARK_USER_DISCONNECTED_SCRIPT, {
    keys: [userSocketsKey(userId), PRESENCE_ONLINE_USERS_SET_KEY],
    arguments: [socketId, userId],
  })

  return { becameOffline: toRedisBoolean(result) }
}

export async function listOnlineUserIds(redis: RedisClient, userIds: string[]) {
  if (userIds.length === 0) return []

  const membership = await redis.smIsMember(
    PRESENCE_ONLINE_USERS_SET_KEY,
    userIds
  )

  return userIds.filter((_, index) => toRedisBoolean(membership[index]))
}
