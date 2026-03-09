import type { QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import type { AppSocket } from "@/lib/socket"

interface MessagesQueryData {
  data: { id: string }[]
}

interface UseMessageDeletionOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
}

export function useMessageDeletion<TData extends MessagesQueryData>({
  socket,
  queryClient,
  channelId,
}: UseMessageDeletionOptions) {
  const removeMessageFromCache = useCallback(
    (messageId: string) => {
      queryClient.setQueryData<TData>(["messages", channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.filter((m) => m.id !== messageId),
        } as TData
      })
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
          // Re-fetch to restore state
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
