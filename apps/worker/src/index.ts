import { env } from "@repo/env/server"
import type { ServerToClientEvents } from "@repo/realtime-types/events"
import { LINK_UNFURL_QUEUE } from "@repo/realtime-types/queues"
import { Emitter } from "@socket.io/redis-emitter"
import { Worker } from "bullmq"
import { createClient } from "redis"
import { createLinkUnfurlProcessor } from "@/jobs/link-unfurl"

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  const dbIndex = Number.parseInt(parsed.pathname.slice(1), 10)
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    db: Number.isFinite(dbIndex) ? dbIndex : 0,
  }
}

async function bootstrap() {
  // Redis client for Socket.IO emitter (uses `redis` v4 package)
  const redisEmitterClient = createClient({ url: env.REDIS_URL })
  redisEmitterClient.on("error", (error) => {
    console.error("[worker] redis emitter error:", error)
  })
  await redisEmitterClient.connect()

  const emitter = new Emitter<ServerToClientEvents>(redisEmitterClient)

  // BullMQ uses ioredis internally — pass connection options, not an instance
  const redisOpts = parseRedisUrl(env.REDIS_URL)

  const linkUnfurlWorker = new Worker(
    LINK_UNFURL_QUEUE,
    createLinkUnfurlProcessor(emitter),
    {
      connection: {
        ...redisOpts,
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
    }
  )

  linkUnfurlWorker.on("failed", (job, error) => {
    console.error(`[worker] link-unfurl job ${job?.id} failed:`, error.message)
  })

  linkUnfurlWorker.on("error", (error) => {
    console.error("[worker] link-unfurl worker error:", {
      queue: LINK_UNFURL_QUEUE,
      workerId: linkUnfurlWorker.id,
      message: error.message,
      stack: error.stack,
    })
  })

  console.log("Worker started, processing queues:", LINK_UNFURL_QUEUE)

  const shutdown = async () => {
    console.log("[worker] shutting down...")
    await linkUnfurlWorker.close()
    await redisEmitterClient.quit()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

bootstrap().catch((error) => {
  console.error("[worker] failed to start:", error)
  process.exit(1)
})
