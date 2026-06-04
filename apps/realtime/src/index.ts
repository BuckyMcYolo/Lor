import { createServer } from "node:http"
import { auth, type Session } from "@repo/auth"
import { and, db, eq, schema } from "@repo/db"
import { env } from "@repo/env/server"
import { enterContext } from "@repo/logger"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "@repo/realtime-types"
import {
  channelRoom,
  channelRoomPayloadSchema,
  deleteMessagePayloadSchema,
  editMessagePayloadSchema,
  markChannelReadPayloadSchema,
  presenceSubscribePayloadSchema,
  sendMessagePayloadSchema,
  threadRoom,
  threadRoomPayloadSchema,
  toggleMessageReactionPayloadSchema,
  typingStartPayloadSchema,
  userRoom,
  workspaceMemberJoinedPayloadSchema,
  workspaceRoom,
} from "@repo/realtime-types"
import type { LinkUnfurlJobData } from "@repo/realtime-types/queues"
import { LINK_UNFURL_QUEUE } from "@repo/realtime-types/queues"
import { createAdapter } from "@socket.io/redis-adapter"
import { Queue } from "bullmq"
import { createClient } from "redis"
import { Server, type Socket } from "socket.io"
import { toErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { assertUserCanAccessChannel } from "@/services/channel-access"
import {
  createMessage,
  deleteMessage,
  editMessage,
  loadThreadSummary,
  toggleMessageReaction,
} from "@/services/messages"
import { buildMessageFanout } from "@/services/notifications"
import {
  listOnlineUserIds,
  markUserConnected,
  markUserDisconnected,
  reconcilePresence,
  refreshPresenceHeartbeat,
} from "@/services/presence"
import {
  enforceDmMessageRateLimit,
  enforceWorkspaceMessageRateLimit,
} from "@/services/rate-limit"
import { getUnreadStatesForUser, markChannelRead } from "@/services/read-states"

type SocketData = {
  user: Session["user"]
  session: Session["session"]
  workspaceIds?: string[]
  initialized?: boolean
  initPromise?: Promise<boolean>
  isAlive?: boolean
}

type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

function toHeaders(
  handshakeHeaders: Record<string, string | string[] | undefined>
) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(handshakeHeaders)) {
    if (value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
      continue
    }

    headers.set(key, value)
  }

  return headers
}

const realtimePort = env.REALTIME_PORT

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "tauri://localhost",
]
const corsOrigins = (env.REALTIME_CORS_ORIGIN || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const redisPubClient = createClient({ url: env.REDIS_URL })
const redisSubClient = redisPubClient.duplicate()
const redisPresenceClient = redisPubClient.duplicate()

redisPubClient.on("error", (error) => {
  logger.error({ err: error }, "Redis pub error")
})
redisSubClient.on("error", (error) => {
  logger.error({ err: error }, "Redis sub error")
})
redisPresenceClient.on("error", (error) => {
  logger.error({ err: error }, "Redis presence error")
})

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok" }))
    return
  }

  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ message: "Not found" }))
})

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  transports: ["websocket"],
  cors: {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error("CORS origin not allowed"), false)
    },
    credentials: true,
  },
})

const CONNECTION_RATE_WINDOW = 60
const CONNECTION_RATE_MAX = 10
const CONNECTION_RATE_TTL = 90

io.use(async (socket, next) => {
  const ip =
    socket.handshake.headers["x-forwarded-for"]
      ?.toString()
      .split(",")[0]
      ?.trim() ||
    socket.handshake.address ||
    "unknown"
  const windowNum = Math.floor(Date.now() / (CONNECTION_RATE_WINDOW * 1000))
  const key = `ratelimit:ws:connect:${ip}:${windowNum}`

  try {
    const count = await redisPresenceClient.incr(key)
    if (count === 1) {
      await redisPresenceClient.expire(key, CONNECTION_RATE_TTL)
    }
    if (count > CONNECTION_RATE_MAX) {
      next(new Error("Too many connections. Try again later."))
      return
    }
  } catch {
    // allow connection if Redis is unavailable
  }
  next()
})

io.use(async (socket, next) => {
  try {
    const session = await auth.api.getSession({
      headers: toHeaders(socket.handshake.headers),
    })

    if (!session) {
      next(new Error("Unauthorized"))
      return
    }

    socket.data.user = session.user
    socket.data.session = session.session
    next()
  } catch {
    next(new Error("Unauthorized"))
  }
})

async function initializeConnection(socket: RealtimeSocket) {
  try {
    const initSocketId = socket.id
    const userPresenceRoom = userRoom(socket.data.user.id)

    const workspaceMembershipRows = await db
      .select({
        workspaceId: schema.workspaceMember.workspaceId,
      })
      .from(schema.workspaceMember)
      .where(eq(schema.workspaceMember.userId, socket.data.user.id))

    const workspaceIds = workspaceMembershipRows.map((row) => row.workspaceId)
    socket.data.workspaceIds = workspaceIds

    const workspacePresenceRooms = workspaceIds.map((workspaceId) =>
      workspaceRoom(workspaceId)
    )
    if (workspacePresenceRooms.length > 0) {
      await socket.join(workspacePresenceRooms)
    }

    const { becameOnline } = await markUserConnected(
      redisPresenceClient,
      socket.data.user.id,
      initSocketId
    )

    const isCurrentSocketAlive =
      socket.data.isAlive === true &&
      socket.connected &&
      socket.id === initSocketId

    if (!isCurrentSocketAlive) {
      if (becameOnline) {
        await markUserDisconnected(
          redisPresenceClient,
          socket.data.user.id,
          initSocketId
        )
      }
      return false
    }

    if (becameOnline && isCurrentSocketAlive) {
      for (const workspaceId of workspaceIds) {
        io.to(workspaceRoom(workspaceId)).emit("presence:user:update", {
          workspaceId,
          userId: socket.data.user.id,
          status: "online",
        })
      }
    }

    // Refresh TTL on the socket set so it expires if this server crashes
    await refreshPresenceHeartbeat(redisPresenceClient, socket.data.user.id)

    // Keep refreshing while connected
    const heartbeatInterval = setInterval(() => {
      void refreshPresenceHeartbeat(
        redisPresenceClient,
        socket.data.user.id
      ).catch(() => {})
    }, 30 * 1000)

    socket.once("disconnect", () => {
      clearInterval(heartbeatInterval)
    })

    socket.emit("presence:ready", {
      userId: socket.data.user.id,
      rooms: {
        user: userPresenceRoom,
        workspaces: workspacePresenceRooms,
      },
    })

    // Bootstrap unread state BEFORE joining userRoom so live notifications
    // arriving after join don't get wiped by a later bootstrap emit
    try {
      const bootstrap = await getUnreadStatesForUser(socket.data.user.id)
      socket.emit("notification:bootstrap", bootstrap)
    } catch (err) {
      logger.error(
        { err, socketId: socket.id, userId: socket.data.user.id },
        "Failed to bootstrap unread states"
      )
    }

    await socket.join(userPresenceRoom)

    return true
  } catch (error) {
    logger.error(
      { err: error, socketId: socket.id, userId: socket.data.user.id },
      "initializeConnection failed"
    )
    socket.disconnect(true)
    return false
  }
}

io.on("connection", (socket) => {
  socket.data.isAlive = true
  socket.data.initialized = false
  socket.data.initPromise = initializeConnection(socket).then((initialized) => {
    socket.data.initialized = initialized
    return initialized
  })

  // Attach { socketId, userId } to every log line emitted while handling
  // an event from this socket.
  socket.use((_event, next) => {
    enterContext({ socketId: socket.id, userId: socket.data.user?.id })
    next()
  })

  socket.on("presence:subscribe", async (payload, ack) => {
    try {
      if (!socket.data.initialized) {
        await socket.data.initPromise
      }

      if (!socket.data.initialized) {
        ack?.({ ok: false, error: "Socket initialization incomplete" })
        return
      }

      const parsed = presenceSubscribePayloadSchema.parse(payload)
      const workspaceIds = socket.data.workspaceIds ?? []

      if (!workspaceIds.includes(parsed.workspaceId)) {
        ack?.({ ok: false, error: "Forbidden" })
        return
      }

      const workspaceMemberRows = await db
        .select({
          userId: schema.workspaceMember.userId,
        })
        .from(schema.workspaceMember)
        .where(eq(schema.workspaceMember.workspaceId, parsed.workspaceId))

      const userIds = [...new Set(workspaceMemberRows.map((row) => row.userId))]
      const onlineUserIds = await listOnlineUserIds(
        redisPresenceClient,
        userIds
      )

      ack?.({
        ok: true,
        snapshot: {
          workspaceId: parsed.workspaceId,
          onlineUserIds,
        },
      })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("channel:join", async (payload, ack) => {
    try {
      const parsed = channelRoomPayloadSchema.parse(payload)
      await assertUserCanAccessChannel(socket.data.user.id, parsed.channelId)
      await socket.join(channelRoom(parsed.channelId))
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("channel:leave", async (payload, ack) => {
    try {
      const parsed = channelRoomPayloadSchema.parse(payload)
      await socket.leave(channelRoom(parsed.channelId))
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("thread:join", async (payload, ack) => {
    try {
      const parsed = threadRoomPayloadSchema.parse(payload)
      // Verify the user can access the thread's channel.
      const root = await db
        .select({ channelId: schema.message.channelId })
        .from(schema.message)
        .where(eq(schema.message.id, parsed.threadRootId))
        .limit(1)
        .then((rows) => rows[0])
      if (!root) throw new Error("Thread not found")
      await assertUserCanAccessChannel(socket.data.user.id, root.channelId)
      await socket.join(threadRoom(parsed.threadRootId))
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("thread:leave", async (payload, ack) => {
    try {
      const parsed = threadRoomPayloadSchema.parse(payload)
      await socket.leave(threadRoom(parsed.threadRootId))
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("message:send", async (payload, ack) => {
    try {
      const parsed = sendMessagePayloadSchema.parse(payload)
      const accessibleChannel = await assertUserCanAccessChannel(
        socket.data.user.id,
        parsed.channelId
      )

      if (accessibleChannel.workspaceId && accessibleChannel.memberRole) {
        await enforceWorkspaceMessageRateLimit(redisPresenceClient, {
          workspaceId: accessibleChannel.workspaceId,
          userId: socket.data.user.id,
          role: accessibleChannel.memberRole,
        })
      } else {
        await enforceDmMessageRateLimit(
          redisPresenceClient,
          socket.data.user.id
        )
      }

      const createdMessage = await createMessage({
        userId: socket.data.user.id,
        payload: parsed,
        accessibleChannel,
      })

      const fanout = await buildMessageFanout({
        authorId: socket.data.user.id,
        channel: createdMessage.channel,
        message: createdMessage.message,
      })

      const messageWithMentions = {
        ...createdMessage.message,
        mentions: fanout.messageMentions,
      }

      // Thread replies broadcast to the thread room only; the channel feed
      // gets a lightweight `message:thread:updated` instead so its
      // "N replies" footer can update without showing the reply inline.
      if (messageWithMentions.threadRootId) {
        socket
          .to(threadRoom(messageWithMentions.threadRootId))
          .emit("message:created", messageWithMentions)
        const summary = await loadThreadSummary(
          parsed.channelId,
          messageWithMentions.threadRootId
        )
        io.to(channelRoom(parsed.channelId)).emit(
          "message:thread:updated",
          summary
        )
      } else {
        socket
          .to(channelRoom(parsed.channelId))
          .emit("message:created", messageWithMentions)
      }

      for (const unreadNotification of fanout.unreadNotifications) {
        io.to(userRoom(unreadNotification.userId)).emit(
          "notification:unread",
          unreadNotification.payload
        )
      }

      for (const mentionNotification of fanout.mentionNotifications) {
        io.to(userRoom(mentionNotification.userId)).emit(
          "notification:mention",
          mentionNotification.payload
        )
      }

      ack?.({ ok: true, message: messageWithMentions })

      // Enqueue link unfurl job if the message contains a URL
      const rawUrlMatches =
        parsed.content?.match(/https?:\/\/[^\s<>"[\]]+/g) ?? null
      const urlMatches = rawUrlMatches
        ? [
            ...new Set(
              rawUrlMatches.map((u) => u.replace(/[.,!?:;'")\]]+$/, ""))
            ),
          ]
        : null
      if (urlMatches && urlMatches.length > 0) {
        void linkUnfurlQueue
          .add("unfurl", {
            messageId: createdMessage.message.id,
            channelId: parsed.channelId,
            urls: urlMatches,
          })
          .catch((err) => {
            logger.error({ err }, "Failed to enqueue link-unfurl")
          })
      }
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("message:delete", async (payload, ack) => {
    try {
      const parsed = deleteMessagePayloadSchema.parse(payload)
      const result = await deleteMessage({
        userId: socket.data.user.id,
        payload: parsed,
      })

      const deletedPayload = {
        channelId: result.channelId,
        messageId: result.messageId,
      }

      if (result.threadRootId) {
        // Thread reply: broadcast to thread room and refresh the channel's
        // footer summary so the "N replies" count ticks down (or clears
        // entirely if this was the last reply).
        socket
          .to(threadRoom(result.threadRootId))
          .emit("message:deleted", deletedPayload)
        const summary = await loadThreadSummary(
          parsed.channelId,
          result.threadRootId
        )
        io.to(channelRoom(parsed.channelId)).emit(
          "message:thread:updated",
          summary
        )
      } else {
        socket
          .to(channelRoom(parsed.channelId))
          .emit("message:deleted", deletedPayload)
      }

      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("message:edit", async (payload, ack) => {
    try {
      const parsed = editMessagePayloadSchema.parse(payload)
      const result = await editMessage({
        userId: socket.data.user.id,
        payload: parsed,
      })

      socket.to(channelRoom(parsed.channelId)).emit("message:updated", {
        channelId: result.channelId,
        messageId: result.messageId,
        content: result.content,
        editedAt: result.editedAt,
      })

      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("message:reaction:toggle", async (payload, ack) => {
    try {
      const parsed = toggleMessageReactionPayloadSchema.parse(payload)
      const reactionUpdate = await toggleMessageReaction({
        userId: socket.data.user.id,
        userName: socket.data.user.name,
        payload: parsed,
      })

      socket
        .to(channelRoom(parsed.channelId))
        .emit("message:reaction:updated", reactionUpdate.update)

      ack?.({
        ok: true,
        update: reactionUpdate.update,
      })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("channel:mark-read", async (payload, ack) => {
    try {
      const parsed = markChannelReadPayloadSchema.parse(payload)
      const state = await markChannelRead({
        userId: socket.data.user.id,
        channelId: parsed.channelId,
        lastReadMessageId: parsed.lastReadMessageId,
      })

      // Broadcast to other tabs/devices for this user
      socket.to(userRoom(socket.data.user.id)).emit("channel:read-state", state)
      // Also send back to the requesting socket
      socket.emit("channel:read-state", state)
      ack?.({ ok: true, state })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("typing:start", async (payload) => {
    try {
      const parsed = typingStartPayloadSchema.parse(payload)
      await assertUserCanAccessChannel(socket.data.user.id, parsed.channelId)

      socket.to(channelRoom(parsed.channelId)).emit("typing:update", {
        channelId: parsed.channelId,
        userId: socket.data.user.id,
        name: socket.data.user.name,
      })
    } catch {
      // silently ignore — unauthorized or invalid payload
    }
  })

  socket.on("workspace:member:joined", async (payload, ack) => {
    try {
      const parsed = workspaceMemberJoinedPayloadSchema.parse(payload)

      // Verify the user is actually a member of this workspace
      const membership = await db
        .select({ workspaceId: schema.workspaceMember.workspaceId })
        .from(schema.workspaceMember)
        .where(
          and(
            eq(schema.workspaceMember.workspaceId, parsed.workspaceId),
            eq(schema.workspaceMember.userId, socket.data.user.id)
          )
        )
        .limit(1)
        .then((rows) => rows[0])

      if (!membership) {
        ack?.({ ok: false, error: "Forbidden" })
        return
      }

      // Join the workspace room so the new member receives future events
      await socket.join(workspaceRoom(parsed.workspaceId))

      // Deduplicate workspaceIds
      const currentWorkspaceIds = socket.data.workspaceIds ?? []
      if (!currentWorkspaceIds.includes(parsed.workspaceId)) {
        socket.data.workspaceIds = [...currentWorkspaceIds, parsed.workspaceId]
      }

      // Broadcast to other workspace members
      socket
        .to(workspaceRoom(parsed.workspaceId))
        .emit("workspace:member:joined", {
          workspaceId: parsed.workspaceId,
          userId: socket.data.user.id,
          name: socket.data.user.name,
          username: socket.data.user.username ?? null,
          image: socket.data.user.image ?? null,
        })

      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("disconnect", () => {
    socket.data.isAlive = false

    void (async () => {
      try {
        const { becameOffline } = await markUserDisconnected(
          redisPresenceClient,
          socket.data.user.id,
          socket.id
        )

        if (!becameOffline) return

        for (const workspaceId of socket.data.workspaceIds ?? []) {
          io.to(workspaceRoom(workspaceId)).emit("presence:user:update", {
            workspaceId,
            userId: socket.data.user.id,
            status: "offline",
          })
        }
      } catch (error) {
        logger.error(
          { err: error, socketId: socket.id, userId: socket.data.user.id },
          "Disconnect presence cleanup failed"
        )
      }
    })()
  })
})

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

const linkUnfurlQueue = new Queue<LinkUnfurlJobData>(LINK_UNFURL_QUEUE, {
  connection: {
    ...parseRedisUrl(env.REDIS_URL),
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
})

async function bootstrap() {
  await Promise.all([
    redisPubClient.connect(),
    redisSubClient.connect(),
    redisPresenceClient.connect(),
  ])

  io.adapter(createAdapter(redisPubClient, redisSubClient))

  // Periodically clean up stale presence entries (crashed servers)
  setInterval(() => {
    void reconcilePresence(redisPresenceClient).catch((error) => {
      logger.error({ err: error }, "Presence reconciliation failed")
    })
  }, 30 * 1000)

  httpServer.listen(realtimePort, () => {
    logger.info({ port: realtimePort }, "Realtime server running")
    logger.info({ origins: corsOrigins }, "Allowed origins")
  })
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "Failed to start")
  process.exit(1)
})
