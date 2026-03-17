import type { TypingIndicatorEvent } from "@repo/realtime-types"
import { useCallback, useEffect, useRef, useState } from "react"
import type { AppSocket } from "@/lib/socket"

type TypingUser = {
  userId: string
  name: string
  expiresAt: number
}

const TYPING_THROTTLE_MS = 3000
const TYPING_EXPIRE_MS = 5000

export function useTypingIndicator({
  socket,
  channelId,
  currentUserId,
}: {
  socket: AppSocket | null
  channelId: string
  currentUserId: string | undefined
}) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const lastEmitRef = useRef(0)
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Emit typing event (throttled)
  const emitTyping = useCallback(() => {
    if (!socket?.connected) return
    const now = Date.now()
    if (now - lastEmitRef.current < TYPING_THROTTLE_MS) return
    lastEmitRef.current = now
    socket.emit("typing:start", { channelId })
  }, [socket, channelId])

  // Listen for typing events from others
  useEffect(() => {
    if (!socket) return

    const onTypingUpdate = (payload: TypingIndicatorEvent) => {
      if (payload.channelId !== channelId) return
      if (payload.userId === currentUserId) return

      setTypingUsers((prev) => {
        const expiresAt = Date.now() + TYPING_EXPIRE_MS
        const existing = prev.find((u) => u.userId === payload.userId)
        if (existing) {
          return prev.map((u) =>
            u.userId === payload.userId ? { ...u, expiresAt } : u
          )
        }
        return [
          ...prev,
          { userId: payload.userId, name: payload.name, expiresAt },
        ]
      })
    }

    socket.on("typing:update", onTypingUpdate)

    return () => {
      socket.off("typing:update", onTypingUpdate)
    }
  }, [socket, channelId, currentUserId])

  // Cleanup expired entries
  useEffect(() => {
    cleanupTimerRef.current = setInterval(() => {
      const now = Date.now()
      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.expiresAt > now)
        if (filtered.length === prev.length) return prev
        return filtered
      })
    }, 1000)

    return () => {
      if (cleanupTimerRef.current) clearInterval(cleanupTimerRef.current)
    }
  }, [])

  // Reset when channel changes
  useEffect(() => {
    setTypingUsers([])
    lastEmitRef.current = 0
  }, [channelId])

  return {
    typingUsers,
    emitTyping,
  }
}
