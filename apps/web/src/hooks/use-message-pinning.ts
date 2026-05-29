import type { RealtimeMessagePinToggled } from "@repo/realtime-types"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { updateMessagesAcrossPages } from "@/lib/message-cache-utils"
import type { AppSocket } from "@/lib/socket"

interface MessagePage {
  data: { id: string; pinned: boolean }[]
}

interface UseMessagePinningOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
  workspaceSlug: string
}

export function useMessagePinning({
  socket,
  queryClient,
  channelId,
  workspaceSlug,
}: UseMessagePinningOptions) {
  const updatePinInCache = useCallback(
    (messageId: string, pinned: boolean) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return updateMessagesAcrossPages(old, (msgs) =>
            msgs.map((m) => (m.id === messageId ? { ...m, pinned } : m))
          )
        }
      )
      void queryClient.invalidateQueries({
        queryKey: ["pinned-messages", channelId],
      })
    },
    [queryClient, channelId]
  )

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
      updatePinInCache(messageId, !currentlyPinned)

      try {
        const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
          ":channelId"
        ].messages[":messageId"].pin.$patch({
          param: { workspaceSlug, channelId, messageId },
        })

        if (!res.ok) {
          updatePinInCache(messageId, currentlyPinned)
        }
      } catch {
        updatePinInCache(messageId, currentlyPinned)
      }
    },
    [workspaceSlug, channelId, updatePinInCache]
  )

  return { handleTogglePin }
}
