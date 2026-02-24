import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useRef } from "react"
import { ChatSkeleton } from "@/components/chat/chat-skeleton"
import { ChatHeader } from "@/components/chat/header"
import { MessageInput } from "@/components/chat/message-input"
import { MessageList } from "@/components/chat/message-list"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"
import type { ListDMMessagesResponse } from "@/lib/api-types"
import {
  createOptimisticMessage,
  realtimeMessageToMessage,
} from "@/lib/realtime-adapter"

export const Route = createFileRoute("/_authenticated/dms/$dmId")({
  component: DMConversation,
})

function DMConversation() {
  const { dmId } = Route.useParams()
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const pendingNonces = useRef(new Set<string>())

  const { data: dm, isPending } = useQuery({
    queryKey: ["dms", dmId],
    queryFn: async () => {
      const res = await apiClient.v1.dms[":dmId"].$get({ param: { dmId } })
      if (!res.ok) throw new Error("Failed to fetch DM")
      return res.json()
    },
  })

  const { data: messagesData, isPending: messagesLoading } = useQuery({
    queryKey: ["messages", dmId],
    queryFn: async () => {
      const res = await apiClient.v1.dms[":dmId"].messages.$get({
        param: { dmId },
        query: {},
      })
      if (!res.ok) throw new Error("Failed to fetch messages")
      return res.json()
    },
    enabled: !!dm,
  })

  // Join/leave the DM channel room for real-time messages
  useEffect(() => {
    if (!socket?.connected) return

    socket.emit("channel:join", { channelId: dmId })

    return () => {
      socket.emit("channel:leave", { channelId: dmId })
    }
  }, [socket, dmId])

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      msg: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (msg.channelId !== dmId) return

      queryClient.setQueryData<ListDMMessagesResponse>(
        ["messages", dmId],
        (old) => {
          if (!old) return old
          if (msg.nonce && pendingNonces.current.has(msg.nonce)) {
            pendingNonces.current.delete(msg.nonce)
            return {
              ...old,
              data: old.data.map((m) =>
                m.id === msg.nonce ? realtimeMessageToMessage(msg) : m
              ),
            }
          }
          if (old.data.some((m) => m.id === msg.id)) return old
          return {
            ...old,
            data: [realtimeMessageToMessage(msg), ...old.data],
          }
        }
      )
    }

    socket.on("message:created", handleMessageCreated)
    return () => {
      socket.off("message:created", handleMessageCreated)
    }
  }, [socket, dmId, queryClient])

  const handleSend = useCallback(
    (content: string) => {
      if (!socket?.connected || !session?.user) return

      const nonce = crypto.randomUUID()
      pendingNonces.current.add(nonce)

      const author = {
        id: session.user.id,
        name: session.user.name,
        username: session.user.username ?? null,
        displayUsername: session.user.displayUsername ?? null,
        image: session.user.image ?? null,
      }

      queryClient.setQueryData<ListDMMessagesResponse>(
        ["messages", dmId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: [
              createOptimisticMessage(nonce, dmId, content, author),
              ...old.data,
            ],
          }
        }
      )

      socket.emit(
        "message:send",
        { channelId: dmId, content, nonce },
        (result) => {
          if (!result.ok) {
            console.error("[chat] send failed:", result.error)
            pendingNonces.current.delete(nonce)
            queryClient.setQueryData<ListDMMessagesResponse>(
              ["messages", dmId],
              (old) => {
                if (!old) return old
                return { ...old, data: old.data.filter((m) => m.id !== nonce) }
              }
            )
            return
          }

          pendingNonces.current.delete(nonce)
          queryClient.setQueryData<ListDMMessagesResponse>(
            ["messages", dmId],
            (old) => {
              if (!old) return old
              return {
                ...old,
                data: old.data.map((m) =>
                  m.id === nonce ? realtimeMessageToMessage(result.message) : m
                ),
              }
            }
          )
        }
      )
    },
    [socket, dmId, queryClient, session]
  )

  if (isPending) {
    return <ChatSkeleton />
  }

  if (!dm) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          Conversation not found
        </span>
      </div>
    )
  }

  const context =
    dm.type === "group_dm"
      ? {
          type: "group_dm" as const,
          name:
            dm.name ??
            (dm.members
              .map((m) => m.name?.trim() ?? "")
              .filter((name) => name.length > 0)
              .join(", ") ||
              "Unknown group"),
          memberCount: dm.members.length,
        }
      : {
          type: "dm" as const,
          name: dm.members[0]?.name ?? "Unknown",
          avatarUrl: dm.members[0]?.image ?? undefined,
        }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader context={context} />
      <MessageList
        context={context}
        messages={messagesData?.data ?? []}
        isLoading={messagesLoading}
      />
      <MessageInput context={context} onSend={handleSend} />
    </div>
  )
}
