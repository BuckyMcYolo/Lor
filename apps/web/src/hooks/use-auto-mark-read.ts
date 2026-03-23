import type { RealtimeMessage } from "@repo/realtime-types"
import { useEffect, useRef } from "react"
import { useSocket } from "@/context/socket-context"
import { useUnread } from "@/context/unread-context"

const DEBOUNCE_MS = 1000

export function useAutoMarkRead(channelId: string | undefined) {
  const { markChannelRead } = useUnread()
  const socket = useSocket()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelIdRef = useRef(channelId)
  channelIdRef.current = channelId

  const debouncedMarkRead = () => {
    if (!channelIdRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (channelIdRef.current) {
        markChannelRead(channelIdRef.current)
      }
    }, DEBOUNCE_MS)
  }

  // Mark read on mount
  useEffect(() => {
    if (!channelId) return
    debouncedMarkRead()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [channelId])

  // Mark read when tab becomes visible
  useEffect(() => {
    if (!channelId) return

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        debouncedMarkRead()
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [channelId])

  // Mark read when new messages arrive while focused
  useEffect(() => {
    if (!socket || !channelId) return

    const onMessageCreated = (message: RealtimeMessage) => {
      if (
        message.channelId === channelIdRef.current &&
        document.visibilityState === "visible"
      ) {
        debouncedMarkRead()
      }
    }

    socket.on("message:created", onMessageCreated)
    return () => {
      socket.off("message:created", onMessageCreated)
    }
  }, [socket, channelId])
}
