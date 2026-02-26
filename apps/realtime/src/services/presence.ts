import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import type { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient>

function userSocketsKey(userId: string) {
  return `presence:user:${userId}:sockets`
}

export async function markUserConnected(
  redis: RedisClient,
  userId: string,
  socketId: string
) {
  await redis.sAdd(userSocketsKey(userId), socketId)
  const socketCount = await redis.sCard(userSocketsKey(userId))

  if (socketCount === 1) {
    await redis.sAdd(PRESENCE_ONLINE_USERS_SET_KEY, userId)
    return { becameOnline: true }
  }

  return { becameOnline: false }
}

export async function markUserDisconnected(
  redis: RedisClient,
  userId: string,
  socketId: string
) {
  await redis.sRem(userSocketsKey(userId), socketId)
  const socketCount = await redis.sCard(userSocketsKey(userId))

  if (socketCount === 0) {
    await Promise.all([
      redis.sRem(PRESENCE_ONLINE_USERS_SET_KEY, userId),
      redis.del(userSocketsKey(userId)),
    ])
    return { becameOffline: true }
  }

  return { becameOffline: false }
}

export async function listOnlineUserIds(redis: RedisClient, userIds: string[]) {
  if (userIds.length === 0) return []

  const membership = await Promise.all(
    userIds.map((userId) =>
      redis.sIsMember(PRESENCE_ONLINE_USERS_SET_KEY, userId)
    )
  )

  return userIds.filter((_, index) => membership[index] === true)
}
