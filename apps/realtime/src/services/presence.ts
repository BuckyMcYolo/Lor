import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import type { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient>

const PRESENCE_HEARTBEAT_TTL = 60

const MARK_USER_CONNECTED_SCRIPT = `
redis.call("SADD", KEYS[1], ARGV[1])
redis.call("EXPIRE", KEYS[1], ARGV[3])
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
    arguments: [socketId, userId, String(PRESENCE_HEARTBEAT_TTL)],
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

/**
 * Refresh the TTL on a user's socket set so it expires if the server dies
 * without running disconnect handlers. Call periodically per socket.
 */
export async function refreshPresenceHeartbeat(
  redis: RedisClient,
  userId: string
) {
  const key = userSocketsKey(userId)
  await redis.expire(key, PRESENCE_HEARTBEAT_TTL)
}

/**
 * Reconcile the online-users set by removing users whose socket sets have
 * expired (server crash / no heartbeat). Call periodically on a timer.
 */
export async function reconcilePresence(redis: RedisClient) {
  const onlineUserIds = await redis.sMembers(PRESENCE_ONLINE_USERS_SET_KEY)
  if (onlineUserIds.length === 0) return []

  const staleUserIds: string[] = []

  for (const userId of onlineUserIds) {
    const exists = await redis.exists(userSocketsKey(userId))
    if (!exists) {
      staleUserIds.push(userId)
    }
  }

  if (staleUserIds.length > 0) {
    await redis.sRem(PRESENCE_ONLINE_USERS_SET_KEY, staleUserIds)
    console.log(
      `[realtime] reconciled ${staleUserIds.length} stale presence entries`
    )
  }

  return staleUserIds
}
