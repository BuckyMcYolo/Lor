import type { RealtimeMessageReactionUpdated } from "@repo/realtime-types"
import type { QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import {
  applyReactionUpdateToMessage,
  toggleReactionOptimistically,
} from "@/lib/realtime-adapter"
import type { AppSocket } from "@/lib/socket"

type MessageWithReactions = Parameters<typeof toggleReactionOptimistically>[0]

interface MessagesQueryData {
  data: MessageWithReactions[]
}

interface UseMessageReactionsOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
  currentUserId?: string
}

export function useMessageReactions<TData extends MessagesQueryData>({
  socket,
  queryClient,
  channelId,
  currentUserId,
}: UseMessageReactionsOptions) {
  const updateMessageInCache = useCallback(
    (
      messageId: string,
      updater: (message: MessageWithReactions) => MessageWithReactions
    ) => {
      queryClient.setQueryData<TData>(["messages", channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((message) =>
            message.id === messageId ? updater(message) : message
          ),
        }
      })
    },
    [queryClient, channelId]
  )

  const toggleReactionLocal = useCallback(
    (messageId: string, emoji: string) => {
      updateMessageInCache(messageId, (message) =>
        toggleReactionOptimistically(message, emoji)
      )
    },
    [updateMessageInCache]
  )

  const applyReactionServerUpdate = useCallback(
    (update: RealtimeMessageReactionUpdated) => {
      updateMessageInCache(update.messageId, (message) =>
        applyReactionUpdateToMessage(message, update, currentUserId)
      )
    },
    [updateMessageInCache, currentUserId]
  )

  useEffect(() => {
    if (!socket) return

    const handleReactionUpdated = (update: RealtimeMessageReactionUpdated) => {
      if (update.channelId !== channelId) return
      applyReactionServerUpdate(update)
    }

    socket.on("message:reaction:updated", handleReactionUpdated)
    return () => {
      socket.off("message:reaction:updated", handleReactionUpdated)
    }
  }, [socket, channelId, applyReactionServerUpdate])

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket?.connected || !currentUserId) return

      toggleReactionLocal(messageId, emoji)

      socket.emit(
        "message:reaction:toggle",
        { channelId, messageId, emoji },
        (result) => {
          if (!result.ok) {
            console.error("[chat] toggle reaction failed:", result.error)
            toggleReactionLocal(messageId, emoji)
            return
          }

          applyReactionServerUpdate(result.update)
        }
      )
    },
    [
      socket,
      currentUserId,
      channelId,
      toggleReactionLocal,
      applyReactionServerUpdate,
    ]
  )

  return { handleReact }
}
