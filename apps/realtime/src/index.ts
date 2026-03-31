import { createServer } from "node:http"
import { auth, type Session } from "@repo/auth"
import { and, db, eq, inArray, or, schema } from "@repo/db"
import { env } from "@repo/env/server"
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
  guildMemberJoinedPayloadSchema,
  guildRoom,
  markChannelReadPayloadSchema,
  presenceSubscribePayloadSchema,
  sendMessagePayloadSchema,
  toggleMessageReactionPayloadSchema,
  typingStartPayloadSchema,
  userRoom,
} from "@repo/realtime-types"
import type { LinkUnfurlJobData } from "@repo/realtime-types/queues"
import { LINK_UNFURL_QUEUE } from "@repo/realtime-types/queues"
import { createAdapter } from "@socket.io/redis-adapter"
import { Queue } from "bullmq"
import { createClient } from "redis"
import { Server, type Socket } from "socket.io"
import { toErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { isDMBlockedForUser } from "@/services/blocks"
import { assertUserCanAccessChannel } from "@/services/channel-access"
import {
  createMessage,
  deleteMessage,
  editMessage,
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
  enforceGuildMessageRateLimit,
} from "@/services/rate-limit"
import { getUnreadStatesForUser, markChannelRead } from "@/services/read-states"

type SocketData = {
  user: Session["user"]
  session: Session["session"]
  guildIds?: string[]
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

    const guildMembershipRows = await db
      .select({
        guildId: schema.guildMember.guildId,
      })
      .from(schema.guildMember)
      .where(eq(schema.guildMember.userId, socket.data.user.id))

    const guildIds = guildMembershipRows.map((row) => row.guildId)
    socket.data.guildIds = guildIds

    const guildPresenceRooms = guildIds.map((guildId) => guildRoom(guildId))
    if (guildPresenceRooms.length > 0) {
      await socket.join(guildPresenceRooms)
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
      // Check user's online status privacy before broadcasting
      const privacyRow = await db
        .select({
          onlineStatusPrivacy: schema.userPrivacySettings.onlineStatusPrivacy,
        })
        .from(schema.userPrivacySettings)
        .where(eq(schema.userPrivacySettings.userId, socket.data.user.id))
        .limit(1)
        .then((rows) => rows[0])

      const onlinePrivacy = privacyRow?.onlineStatusPrivacy ?? "everyone"

      if (onlinePrivacy !== "no_one") {
        for (const guildId of guildIds) {
          io.to(guildRoom(guildId)).emit("presence:user:update", {
            guildId,
            userId: socket.data.user.id,
            status: "online",
          })
        }
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
        guilds: guildPresenceRooms,
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
      const guildIds = socket.data.guildIds ?? []

      if (!guildIds.includes(parsed.guildId)) {
        ack?.({ ok: false, error: "Forbidden" })
        return
      }

      const guildMemberRows = await db
        .select({
          userId: schema.guildMember.userId,
        })
        .from(schema.guildMember)
        .where(eq(schema.guildMember.guildId, parsed.guildId))

      const userIds = [...new Set(guildMemberRows.map((row) => row.userId))]
      const onlineUserIds = await listOnlineUserIds(
        redisPresenceClient,
        userIds
      )

      // Filter online users by their privacy settings
      const requestingUserId = socket.data.user.id
      let visibleOnlineUserIds = onlineUserIds

      if (onlineUserIds.length > 0) {
        // Fetch privacy settings for online users (excluding the requester)
        const otherOnlineIds = onlineUserIds.filter(
          (id) => id !== requestingUserId
        )

        if (otherOnlineIds.length > 0) {
          const privacyRows = await db
            .select({
              userId: schema.userPrivacySettings.userId,
              onlineStatusPrivacy:
                schema.userPrivacySettings.onlineStatusPrivacy,
            })
            .from(schema.userPrivacySettings)
            .where(inArray(schema.userPrivacySettings.userId, otherOnlineIds))

          const privacyByUserId = new Map(
            privacyRows.map((r) => [r.userId, r.onlineStatusPrivacy])
          )

          // Find users with "allies_only" privacy
          const alliesOnlyIds = otherOnlineIds.filter(
            (id) => privacyByUserId.get(id) === "allies_only"
          )

          // Find users with "no_one" privacy
          const noOneIds = new Set(
            otherOnlineIds.filter((id) => privacyByUserId.get(id) === "no_one")
          )

          // Check ally relationships for "allies_only" users
          let allyIds = new Set<string>()
          if (alliesOnlyIds.length > 0) {
            const allyRows = await db
              .select({
                senderId: schema.allyRequest.senderId,
                receiverId: schema.allyRequest.receiverId,
              })
              .from(schema.allyRequest)
              .where(
                and(
                  eq(schema.allyRequest.status, "accepted"),
                  or(
                    and(
                      eq(schema.allyRequest.senderId, requestingUserId),
                      inArray(schema.allyRequest.receiverId, alliesOnlyIds)
                    ),
                    and(
                      eq(schema.allyRequest.receiverId, requestingUserId),
                      inArray(schema.allyRequest.senderId, alliesOnlyIds)
                    )
                  )
                )
              )

            allyIds = new Set(
              allyRows.map((r) =>
                r.senderId === requestingUserId ? r.receiverId : r.senderId
              )
            )
          }

          visibleOnlineUserIds = onlineUserIds.filter((id) => {
            if (id === requestingUserId) return true
            if (noOneIds.has(id)) return false
            if (privacyByUserId.get(id) === "allies_only") {
              return allyIds.has(id)
            }
            return true // "everyone" or no settings (default)
          })
        }
      }

      ack?.({
        ok: true,
        snapshot: {
          guildId: parsed.guildId,
          onlineUserIds: visibleOnlineUserIds,
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

  socket.on("message:send", async (payload, ack) => {
    try {
      const parsed = sendMessagePayloadSchema.parse(payload)
      const accessibleChannel = await assertUserCanAccessChannel(
        socket.data.user.id,
        parsed.channelId
      )

      if (accessibleChannel.guildId && accessibleChannel.memberRole) {
        await enforceGuildMessageRateLimit(redisPresenceClient, {
          guildId: accessibleChannel.guildId,
          userId: socket.data.user.id,
          role: accessibleChannel.memberRole,
        })
      } else {
        await enforceDmMessageRateLimit(
          redisPresenceClient,
          socket.data.user.id
        )

        // Block enforcement for 1:1 DMs only (group DMs use client-side filtering)
        if (accessibleChannel.type === "dm") {
          const blocked = await isDMBlockedForUser(
            parsed.channelId,
            socket.data.user.id
          )
          if (blocked) {
            ack?.({
              ok: false,
              error: "Cannot send messages in this conversation",
            })
            return
          }
        }
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

      socket
        .to(channelRoom(parsed.channelId))
        .emit("message:created", messageWithMentions)

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
        parsed.content?.match(/https?:\/\/[^\s<>"]+/g) ?? null
      const urlMatches = rawUrlMatches?.map((u) =>
        u.replace(/[.,!?:;'")\]]+$/, "")
      )
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

      socket.to(channelRoom(parsed.channelId)).emit("message:deleted", {
        channelId: result.channelId,
        messageId: result.messageId,
      })

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
      const accessibleChannel = await assertUserCanAccessChannel(
        socket.data.user.id,
        parsed.channelId
      )

      // Suppress typing in 1:1 DMs if blocked
      if (accessibleChannel.type === "dm") {
        const blocked = await isDMBlockedForUser(
          parsed.channelId,
          socket.data.user.id
        )
        if (blocked) return
      }

      socket.to(channelRoom(parsed.channelId)).emit("typing:update", {
        channelId: parsed.channelId,
        userId: socket.data.user.id,
        name: socket.data.user.name,
      })
    } catch {
      // silently ignore — unauthorized or invalid payload
    }
  })

  socket.on("guild:member:joined", async (payload, ack) => {
    try {
      const parsed = guildMemberJoinedPayloadSchema.parse(payload)

      // Verify the user is actually a member of this guild
      const membership = await db
        .select({ guildId: schema.guildMember.guildId })
        .from(schema.guildMember)
        .where(
          and(
            eq(schema.guildMember.guildId, parsed.guildId),
            eq(schema.guildMember.userId, socket.data.user.id)
          )
        )
        .limit(1)
        .then((rows) => rows[0])

      if (!membership) {
        ack?.({ ok: false, error: "Forbidden" })
        return
      }

      // Join the guild room so the new member receives future events
      await socket.join(guildRoom(parsed.guildId))

      // Deduplicate guildIds
      const currentGuildIds = socket.data.guildIds ?? []
      if (!currentGuildIds.includes(parsed.guildId)) {
        socket.data.guildIds = [...currentGuildIds, parsed.guildId]
      }

      // Broadcast to other guild members
      socket.to(guildRoom(parsed.guildId)).emit("guild:member:joined", {
        guildId: parsed.guildId,
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

        // Check user's online status privacy before broadcasting
        const privacyRow = await db
          .select({
            onlineStatusPrivacy: schema.userPrivacySettings.onlineStatusPrivacy,
          })
          .from(schema.userPrivacySettings)
          .where(eq(schema.userPrivacySettings.userId, socket.data.user.id))
          .limit(1)
          .then((rows) => rows[0])

        const onlinePrivacy = privacyRow?.onlineStatusPrivacy ?? "everyone"

        if (onlinePrivacy !== "no_one") {
          for (const guildId of socket.data.guildIds ?? []) {
            io.to(guildRoom(guildId)).emit("presence:user:update", {
              guildId,
              userId: socket.data.user.id,
              status: "offline",
            })
          }
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
