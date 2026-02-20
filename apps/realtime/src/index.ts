import { createServer } from "node:http"
import { auth, type Session } from "@repo/auth"
import { db, eq, schema } from "@repo/db"
import { env } from "@repo/env/server"
import { Server, type Socket } from "socket.io"
import { toErrorMessage } from "@/lib/errors"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "@/lib/events"
import {
  channelRoomPayloadSchema,
  markChannelReadPayloadSchema,
  sendMessagePayloadSchema,
} from "@/lib/events"
import { channelRoom, guildRoom, userRoom } from "@/lib/rooms"
import { assertUserCanAccessChannel } from "@/services/channel-access"
import { createMessage } from "@/services/messages"
import { buildMessageFanout } from "@/services/notifications"
import { markChannelRead } from "@/services/read-states"

type SocketData = {
  user: Session["user"]
  session: Session["session"]
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
    const userPresenceRoom = userRoom(socket.data.user.id)
    await socket.join(userPresenceRoom)

    const guildMembershipRows = await db
      .select({
        guildId: schema.guildMember.guildId,
      })
      .from(schema.guildMember)
      .where(eq(schema.guildMember.userId, socket.data.user.id))

    const guildPresenceRooms = guildMembershipRows.map((row) =>
      guildRoom(row.guildId)
    )
    if (guildPresenceRooms.length > 0) {
      await socket.join(guildPresenceRooms)
    }

    socket.emit("presence:ready", {
      userId: socket.data.user.id,
      rooms: {
        user: userPresenceRoom,
        guilds: guildPresenceRooms,
      },
    })
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
  }
}

io.on("connection", (socket) => {
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

  void initializeConnection(socket)
})

httpServer.listen(realtimePort, () => {
  console.log(`Realtime server running on port ${realtimePort}`)
  console.log(`Allowed origins: ${corsOrigins.join(", ")}`)
})
