import { createServer } from "node:http"
import { auth, type Session } from "@repo/auth"
import { db, eq, schema } from "@repo/db"
import { env } from "@repo/env/server"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "@repo/realtime-types"
import {
  channelRoom,
  channelRoomPayloadSchema,
  guildRoom,
  markChannelReadPayloadSchema,
  presenceSubscribePayloadSchema,
  sendMessagePayloadSchema,
  userRoom,
} from "@repo/realtime-types"
import { createAdapter } from "@socket.io/redis-adapter"
import { createClient } from "redis"
import { Server, type Socket } from "socket.io"
import { toErrorMessage } from "@/lib/errors"
import { assertUserCanAccessChannel } from "@/services/channel-access"
import { createMessage } from "@/services/messages"
import { buildMessageFanout } from "@/services/notifications"
import {
  listOnlineUserIds,
  markUserConnected,
  markUserDisconnected,
} from "@/services/presence"
import { markChannelRead } from "@/services/read-states"

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

const defaultOrigins = ["http://localhost:3000", "http://localhost:3001"]
const corsOrigins = (env.REALTIME_CORS_ORIGIN || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const redisPubClient = createClient({ url: env.REDIS_URL })
const redisSubClient = redisPubClient.duplicate()
const redisPresenceClient = redisPubClient.duplicate()

redisPubClient.on("error", (error) => {
  console.error("[realtime] redis pub error:", error)
})
redisSubClient.on("error", (error) => {
  console.error("[realtime] redis sub error:", error)
})
redisPresenceClient.on("error", (error) => {
  console.error("[realtime] redis presence error:", error)
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
    await socket.join(userPresenceRoom)

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
      for (const guildId of guildIds) {
        io.to(guildRoom(guildId)).emit("presence:user:update", {
          guildId,
          userId: socket.data.user.id,
          status: "online",
        })
      }
    }

    socket.emit("presence:ready", {
      userId: socket.data.user.id,
      rooms: {
        user: userPresenceRoom,
        guilds: guildPresenceRooms,
      },
    })

    return true
  } catch (error) {
    console.error(
      "initializeConnection failed (schema.guildMember lookup or socket.join):",
      {
        socketId: socket.id,
        userId: socket.data.user.id,
        error,
      }
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

      ack?.({
        ok: true,
        snapshot: {
          guildId: parsed.guildId,
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

  socket.on("message:send", async (payload, ack) => {
    try {
      const parsed = sendMessagePayloadSchema.parse(payload)
      const createdMessage = await createMessage({
        userId: socket.data.user.id,
        payload: parsed,
      })

      socket
        .to(channelRoom(parsed.channelId))
        .emit("message:created", createdMessage.message)

      const fanout = await buildMessageFanout({
        authorId: socket.data.user.id,
        channel: createdMessage.channel,
        message: createdMessage.message,
      })

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

      ack?.({ ok: true, message: createdMessage.message })
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

      socket.to(userRoom(socket.data.user.id)).emit("channel:read-state", state)
      ack?.({ ok: true, state })
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

        for (const guildId of socket.data.guildIds ?? []) {
          io.to(guildRoom(guildId)).emit("presence:user:update", {
            guildId,
            userId: socket.data.user.id,
            status: "offline",
          })
        }
      } catch (error) {
        console.error("[realtime] disconnect presence cleanup failed:", {
          socketId: socket.id,
          userId: socket.data.user.id,
          error,
        })
      }
    })()
  })
})

async function bootstrap() {
  await Promise.all([
    redisPubClient.connect(),
    redisSubClient.connect(),
    redisPresenceClient.connect(),
  ])

  io.adapter(createAdapter(redisPubClient, redisSubClient))

  httpServer.listen(realtimePort, () => {
    console.log(`Realtime server running on port ${realtimePort}`)
    console.log(`Allowed origins: ${corsOrigins.join(", ")}`)
  })
}

bootstrap().catch((error) => {
  console.error("[realtime] failed to start:", error)
  process.exit(1)
})
