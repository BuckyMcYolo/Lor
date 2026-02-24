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

    s.on("connect", () => {
      console.log("[socket] connected:", s.id)
    })

    s.on("disconnect", (reason) => {
      console.log("[socket] disconnected:", reason)
    })

    s.on("connect_error", (err) => {
      console.error("[socket] connection error:", err.message)
    })

    s.connect()
    setSocket(s)

    return () => {
      s.off("connect")
      s.off("disconnect")
      s.off("connect_error")
      s.disconnect()
      setSocket(null)
    }
  }, [enabled])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}
