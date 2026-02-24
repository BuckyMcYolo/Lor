import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type AppSocket, getSocket } from "@/lib/socket"

const SocketContext = createContext<AppSocket | null>(null)

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const [socket, setSocket] = useState<AppSocket | null>(null)

  useEffect(() => {
    if (!enabled) return

    const s = getSocket()

    const onConnect = () => {
      console.log("[socket] connected:", s.id)
    }
    const onDisconnect = (reason: string) => {
      console.log("[socket] disconnected:", reason)
    }
    const onConnectError = (err: Error) => {
      console.error("[socket] connection error:", err.message)
    }

    s.on("connect", onConnect)
    s.on("disconnect", onDisconnect)
    s.on("connect_error", onConnectError)

    s.connect()
    setSocket(s)

    return () => {
      s.off("connect", onConnect)
      s.off("disconnect", onDisconnect)
      s.off("connect_error", onConnectError)
      s.disconnect()
      setSocket(null)
    }
  }, [enabled])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}
