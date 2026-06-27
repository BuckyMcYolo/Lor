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
    toolActivity?: { toolCallId: string; label: string }[]
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
      threadRootId: string | null
      messageId: string
      delta: string
      done: boolean
    }) => {
      if (payload.channelId !== channelId) return
      // Patch the thread cache when the reply lives in a thread, else the channel feed.
      const key = payload.threadRootId
        ? ["thread", payload.threadRootId]
        : ["messages", channelId]
      queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
        if (!old) return old
        return updateMessagesAcrossPages(old, (msgs) =>
          msgs.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  content: (m.content ?? "") + payload.delta,
                  streaming: !payload.done,
                  // Clear any in-flight tool status once the reply settles.
                  ...(payload.done ? { toolActivity: [] } : {}),
                }
              : m
          )
        )
      })
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
      threadRootId: string | null
      messageId: string
      path: string
      action: "created" | "updated"
    }) => {
      if (payload.channelId !== channelId) return
      const key = payload.threadRootId
        ? ["thread", payload.threadRootId]
        : ["messages", channelId]
      queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
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
      })
    }

    socket.on("merlin:memory", handleMemory)
    return () => {
      socket.off("merlin:memory", handleMemory)
    }
  }, [socket, channelId, queryClient])

  useEffect(() => {
    if (!socket) return

    const handleTool = (payload: {
      channelId: string
      threadRootId: string | null
      messageId: string
      toolCallId: string
      label: string
      phase: "start" | "end"
    }) => {
      if (payload.channelId !== channelId) return
      const key = payload.threadRootId
        ? ["thread", payload.threadRootId]
        : ["messages", channelId]
      queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
        if (!old) return old
        return updateMessagesAcrossPages(old, (msgs) =>
          msgs.map((m) => {
            if (m.id !== payload.messageId) return m
            // Drop any prior entry for this call, then re-add it while it runs.
            const rest = (m.toolActivity ?? []).filter(
              (t) => t.toolCallId !== payload.toolCallId
            )
            return {
              ...m,
              toolActivity:
                payload.phase === "start"
                  ? [
                      ...rest,
                      { toolCallId: payload.toolCallId, label: payload.label },
                    ]
                  : rest,
            }
          })
        )
      })
    }

    socket.on("merlin:tool", handleTool)
    return () => {
      socket.off("merlin:tool", handleTool)
    }
  }, [socket, channelId, queryClient])
}
