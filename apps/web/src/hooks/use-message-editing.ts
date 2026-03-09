import type { QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import type { AppSocket } from "@/lib/socket"

interface MessagesQueryData {
  data: { id: string; content: string | null; editedAt: string | null }[]
}

interface UseMessageEditingOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
}

export function useMessageEditing<TData extends MessagesQueryData>({
  socket,
  queryClient,
  channelId,
}: UseMessageEditingOptions) {
  const updateMessageInCache = useCallback(
    (messageId: string, content: string, editedAt: string) => {
      queryClient.setQueryData<TData>(["messages", channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((m) =>
            m.id === messageId ? { ...m, content, editedAt } : m
          ),
        } as TData
      })
    },
    [queryClient, channelId]
  )

  // Listen for message:updated from other clients
  useEffect(() => {
    if (!socket) return

    const handleUpdated = (payload: {
      channelId: string
      messageId: string
      content: string
      editedAt: string
    }) => {
      if (payload.channelId !== channelId) return
      updateMessageInCache(payload.messageId, payload.content, payload.editedAt)
    }

    socket.on("message:updated", handleUpdated)
    return () => {
      socket.off("message:updated", handleUpdated)
    }
  }, [socket, channelId, updateMessageInCache])

  const handleEdit = useCallback(
    (messageId: string, content: string) => {
      if (!socket?.connected) return

      // Optimistically update
      const editedAt = new Date().toISOString()
      updateMessageInCache(messageId, content, editedAt)

      socket.emit(
        "message:edit",
        { channelId, messageId, content },
        (result) => {
          if (!result.ok) {
            console.error("[chat] edit message failed:", result.error)
            void queryClient.invalidateQueries({
              queryKey: ["messages", channelId],
            })
          }
        }
      )
    },
    [socket, channelId, updateMessageInCache, queryClient]
  )

  return { handleEdit }
}
