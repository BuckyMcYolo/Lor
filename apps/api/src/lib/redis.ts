import { env } from "@repo/env/server"
import { createClient, type RedisClientType } from "redis"
import { logger } from "@/lib/logger"

const redisClient: RedisClientType = createClient({ url: env.REDIS_URL })

let connectPromise: Promise<RedisClientType> | null = null

redisClient.on("error", (error) => {
  logger.error({ err: error }, "Redis error")
})

export async function getRedisClient() {
  if (redisClient.isOpen) {
    return redisClient
  }

  if (!connectPromise) {
    connectPromise = redisClient.connect().finally(() => {
      connectPromise = null
    })
  }

  await connectPromise
  return redisClient
}
