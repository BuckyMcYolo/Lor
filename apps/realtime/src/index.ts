import { createServer } from "node:http"
import { auth, type Session } from "@repo/auth"
import { env } from "@repo/env/server"
import { Server } from "socket.io"
import { toErrorMessage } from "@/lib/errors"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "@/lib/events"
import {
  channelRoomPayloadSchema,
  sendMessagePayloadSchema,
} from "@/lib/events"
import { assertUserCanAccessChannel } from "@/services/channel-access"
import { createMessage } from "@/services/messages"

type SocketData = {
  user: Session["user"]
  session: Session["session"]
}

const realtimePort = Number(process.env.REALTIME_PORT ?? env.PORT + 1)
if (!Number.isFinite(realtimePort)) {
  throw new Error("Invalid realtime port")
}

const defaultOrigins = ["http://localhost:3000", "http://localhost:3001"]
const corsOrigins = (
  process.env.REALTIME_CORS_ORIGIN ?? defaultOrigins.join(",")
)
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
      headers: new Headers(socket.handshake.headers as HeadersInit),
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

io.on("connection", (socket) => {
  socket.emit("presence:ready", { userId: socket.data.user.id })

  socket.on("channel:join", async (payload, ack) => {
    try {
      const parsed = channelRoomPayloadSchema.parse(payload)
      await assertUserCanAccessChannel(socket.data.user.id, parsed.channelId)
      await socket.join(parsed.channelId)
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })

  socket.on("channel:leave", async (payload, ack) => {
    try {
      const parsed = channelRoomPayloadSchema.parse(payload)
      await socket.leave(parsed.channelId)
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
        channelId: parsed.channelId,
        content: parsed.content,
        nonce: parsed.nonce,
      })

      io.to(parsed.channelId).emit("message:created", createdMessage)
      ack?.({ ok: true, message: createdMessage })
    } catch (error) {
      ack?.({ ok: false, error: toErrorMessage(error) })
    }
  })
})

httpServer.listen(realtimePort, () => {
  console.log(`Realtime server running on port ${realtimePort}`)
  console.log(`Allowed origins: ${corsOrigins.join(", ")}`)
})
