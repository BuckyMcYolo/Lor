import { env } from "@repo/env/server"
import type { ServerToClientEvents } from "@repo/realtime-types/events"
import {
  LINK_UNFURL_QUEUE,
  MERLIN_RESPOND_QUEUE,
} from "@repo/realtime-types/queues"
import { Emitter } from "@socket.io/redis-emitter"
import { Worker } from "bullmq"
import { createClient } from "redis"
import { createLinkUnfurlProcessor } from "@/jobs/link-unfurl"
import { createMerlinRespondProcessor } from "@/jobs/merlin-respond"
import { logger } from "@/lib/logger"

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
    logger.error({ err: error }, "Redis emitter error")
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
    logger.error({ jobId: job?.id, err: error }, "Link-unfurl job failed")
  })

  linkUnfurlWorker.on("error", (error) => {
    logger.error(
      { queue: LINK_UNFURL_QUEUE, workerId: linkUnfurlWorker.id, err: error },
      "Link-unfurl worker error"
    )
  })

  const merlinRespondWorker = new Worker(
    MERLIN_RESPOND_QUEUE,
    createMerlinRespondProcessor(emitter),
    {
      connection: {
        ...redisOpts,
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
    }
  )

  merlinRespondWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, err: error }, "Merlin-respond job failed")
  })

  merlinRespondWorker.on("error", (error) => {
    logger.error(
      {
        queue: MERLIN_RESPOND_QUEUE,
        workerId: merlinRespondWorker.id,
        err: error,
      },
      "Merlin-respond worker error"
    )
  })

  logger.info(
    { queues: [LINK_UNFURL_QUEUE, MERLIN_RESPOND_QUEUE] },
    "Worker started"
  )

  const shutdown = async () => {
    logger.info("Shutting down...")
    await linkUnfurlWorker.close()
    await merlinRespondWorker.close()
    await redisEmitterClient.quit()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "Failed to start")
  process.exit(1)
})
