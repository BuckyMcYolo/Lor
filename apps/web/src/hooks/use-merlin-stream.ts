import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { updateMessagesAcrossPages } from "@/lib/message-cache-utils"
import type { AppSocket } from "@/lib/socket"

type ToolCall = {
  toolCallId: string
  toolName: string
  label: string
  at?: number
  detail?: { summary?: string; items?: { title: string; url?: string }[] }
  status?: "ok" | "error"
}

interface MessagePage {
  data: {
    id: string
    content: string | null
    streaming?: boolean
    remembered?: { path: string; action: "created" | "updated" }[]
    merlinToolCalls?: ToolCall[]
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
      toolCall: ToolCall
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
            // Upsert into the same trail the server persists, so live and
            // reloaded renders match (start adds the row, completion fills detail).
            const existing = m.merlinToolCalls ?? []
            const idx = existing.findIndex(
              (t) => t.toolCallId === payload.toolCall.toolCallId
            )
            const merlinToolCalls =
              idx >= 0
                ? existing.map((t, i) => (i === idx ? payload.toolCall : t))
                : [...existing, payload.toolCall]
            return { ...m, merlinToolCalls }
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
