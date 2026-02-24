import { env } from "@repo/env/client"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@repo/realtime-types"
import { io, type Socket } from "socket.io-client"

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(env.NEXT_PUBLIC_REALTIME_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket"],
    })
  }
  return socket
}
