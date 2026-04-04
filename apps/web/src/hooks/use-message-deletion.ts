import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { updateMessagesAcrossPages } from "@/lib/message-cache-utils"
import type { AppSocket } from "@/lib/socket"

interface MessagePage {
  data: { id: string }[]
}

interface UseMessageDeletionOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
}

export function useMessageDeletion({
  socket,
  queryClient,
  channelId,
}: UseMessageDeletionOptions) {
  const removeMessageFromCache = useCallback(
    (messageId: string) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return updateMessagesAcrossPages(old, (msgs) =>
            msgs.filter((m) => m.id !== messageId)
          )
        }
      )
    },
    [queryClient, channelId]
  )

  // Listen for message:deleted from other clients
  useEffect(() => {
    if (!socket) return

    const handleDeleted = (payload: {
      channelId: string
      messageId: string
    }) => {
      if (payload.channelId !== channelId) return
      removeMessageFromCache(payload.messageId)
    }

    socket.on("message:deleted", handleDeleted)
    return () => {
      socket.off("message:deleted", handleDeleted)
    }
  }, [socket, channelId, removeMessageFromCache])

  const handleDelete = useCallback(
    (messageId: string) => {
      if (!socket?.connected) return

      // Optimistically remove from cache
      removeMessageFromCache(messageId)

      socket.emit("message:delete", { channelId, messageId }, (result) => {
        if (!result.ok) {
          console.error("[chat] delete message failed:", result.error)
          void queryClient.invalidateQueries({
            queryKey: ["messages", channelId],
          })
        }
      })
    },
    [socket, channelId, removeMessageFromCache, queryClient]
  )

  return { handleDelete }
}
