import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { updateMessagesAcrossPages } from "@/lib/message-cache-utils"
import type { AppSocket } from "@/lib/socket"

interface MessagePage {
  data: {
    id: string
    content: string | null
    streaming?: boolean
    remembered?: { path: string; action: "created" | "updated" }[]
  }[]
}

interface UseMerlinStreamOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
}

// Appends Merlin's streamed reply deltas into its placeholder message and
// toggles a transient `streaming` flag (for the thinking/typing indicator).
export function useMerlinStream({
  socket,
  queryClient,
  channelId,
}: UseMerlinStreamOptions) {
  useEffect(() => {
    if (!socket) return

    const handleStream = (payload: {
      channelId: string
      messageId: string
      delta: string
      done: boolean
    }) => {
      if (payload.channelId !== channelId) return
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return updateMessagesAcrossPages(old, (msgs) =>
            msgs.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    content: (m.content ?? "") + payload.delta,
                    streaming: !payload.done,
                  }
                : m
            )
          )
        }
      )
    }

    socket.on("message:stream", handleStream)
    return () => {
      socket.off("message:stream", handleStream)
    }
  }, [socket, channelId, queryClient])

  useEffect(() => {
    if (!socket) return

    const handleMemory = (payload: {
      channelId: string
      messageId: string
      path: string
      action: "created" | "updated"
    }) => {
      if (payload.channelId !== channelId) return
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return updateMessagesAcrossPages(old, (msgs) =>
            msgs.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    remembered: [
                      ...(m.remembered ?? []).filter(
                        (r) => r.path !== payload.path
                      ),
                      { path: payload.path, action: payload.action },
                    ],
                  }
                : m
            )
          )
        }
      )
    }

    socket.on("merlin:memory", handleMemory)
    return () => {
      socket.off("merlin:memory", handleMemory)
    }
  }, [socket, channelId, queryClient])
}
