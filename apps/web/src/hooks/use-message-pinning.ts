import type { RealtimeMessagePinToggled } from "@repo/realtime-types"
import type { QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type { AppSocket } from "@/lib/socket"

interface MessagesQueryData {
  data: { id: string; pinned: boolean }[]
}

interface UseMessagePinningOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
  guildSlug: string
}

export function useMessagePinning<TData extends MessagesQueryData>({
  socket,
  queryClient,
  channelId,
  guildSlug,
}: UseMessagePinningOptions) {
  const updatePinInCache = useCallback(
    (messageId: string, pinned: boolean) => {
      queryClient.setQueryData<TData>(["messages", channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((m) =>
            m.id === messageId ? { ...m, pinned } : m
          ),
        } as TData
      })
      // Invalidate pinned messages panel cache
      void queryClient.invalidateQueries({
        queryKey: ["pinned-messages", channelId],
      })
    },
    [queryClient, channelId]
  )

  // Listen for pin toggled events from other clients
  useEffect(() => {
    if (!socket) return

    const handlePinToggled = (payload: RealtimeMessagePinToggled) => {
      if (payload.channelId !== channelId) return
      updatePinInCache(payload.messageId, payload.pinned)
    }

    socket.on("message:pin:toggled", handlePinToggled)
    return () => {
      socket.off("message:pin:toggled", handlePinToggled)
    }
  }, [socket, channelId, updatePinInCache])

  const handleTogglePin = useCallback(
    async (messageId: string, currentlyPinned: boolean) => {
      // Optimistically update
      updatePinInCache(messageId, !currentlyPinned)

      try {
        const res = await apiClient.v1.guilds[":guildSlug"].channels[
          ":channelId"
        ].messages[":messageId"].pin.$patch({
          param: { guildSlug, channelId, messageId },
        })

        if (!res.ok) {
          // Revert on failure
          updatePinInCache(messageId, currentlyPinned)
        }
      } catch {
        // Revert on failure
        updatePinInCache(messageId, currentlyPinned)
      }
    },
    [guildSlug, channelId, updatePinInCache]
  )

  return { handleTogglePin }
}
