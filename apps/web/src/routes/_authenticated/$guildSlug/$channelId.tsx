import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useRef } from "react"
import { ChatSkeleton } from "@/components/chat/chat-skeleton"
import { MessageInput } from "@/components/chat/composer/message-input"
import { ChatHeader } from "@/components/chat/header"
import { MessageList } from "@/components/chat/message-list"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"
import type { ListMessagesResponse } from "@/lib/api-types"
import {
  createOptimisticMessage,
  realtimeMessageToMessage,
} from "@/lib/realtime-adapter"

export const Route = createFileRoute("/_authenticated/$guildSlug/$channelId")({
  component: ChannelView,
})

function ChannelView() {
  const { guildSlug, channelId } = Route.useParams()
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { setView, clearView } = useRightSidebar()
  const { data: session } = authClient.useSession()
  // Track nonces for optimistic messages so we can replace them on confirm
  const pendingNonces = useRef(new Set<string>())

  useEffect(() => {
    setView({
      type: "guild-members",
      guildSlug,
      channelId,
    })
    return () => {
      clearView()
    }
  }, [setView, clearView, guildSlug, channelId])

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["channel", guildSlug, channelId],
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].channels[
        ":channelId"
      ].$get({
        param: { guildSlug, channelId },
      })
      if (!res.ok) throw new Error("Failed to fetch channel")
      return res.json()
    },
  })

  const { data: messagesData, isPending: messagesLoading } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].channels[
        ":channelId"
      ].messages.$get({
        param: { guildSlug, channelId },
        query: {},
      })
      if (!res.ok) throw new Error("Failed to fetch messages")
      return res.json()
    },
    enabled: !!data,
  })

  const { data: guildMembersData } = useQuery({
    queryKey: ["guild-members", guildSlug],
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].members.$get({
        param: { guildSlug },
      })
      if (!res.ok) throw new Error("Failed to fetch guild members")
      return res.json()
    },
  })

  // Join/leave the channel room for real-time messages
  useEffect(() => {
    if (!socket) return

    socket.emit("channel:join", { channelId })

    return () => {
      socket.emit("channel:leave", { channelId })
    }
  }, [socket, channelId])

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      msg: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (msg.channelId !== channelId) return

      queryClient.setQueryData<ListMessagesResponse>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          // If this message was sent by us, replace the optimistic entry
          if (msg.nonce && pendingNonces.current.has(msg.nonce)) {
            pendingNonces.current.delete(msg.nonce)
            return {
              ...old,
              data: old.data.map((m) =>
                m.id === msg.nonce ? realtimeMessageToMessage(msg) : m
              ),
            }
          }
          // Otherwise it's from someone else — prepend if not already present
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
  }, [socket, channelId, queryClient])

  const handleSend = useCallback(
    (
      content: string,
      options?: { mentions: ListMessagesResponse["data"][number]["mentions"] }
    ) => {
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

      // Insert optimistic message immediately
      queryClient.setQueryData<ListMessagesResponse>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: [
              createOptimisticMessage(
                nonce,
                channelId,
                content,
                author,
                options?.mentions ?? []
              ),
              ...old.data,
            ],
          }
        }
      )

      socket.emit("message:send", { channelId, content, nonce }, (result) => {
        if (!result.ok) {
          console.error("[chat] send failed:", result.error)
          // Remove the optimistic message on failure
          pendingNonces.current.delete(nonce)
          queryClient.setQueryData<ListMessagesResponse>(
            ["messages", channelId],
            (old) => {
              if (!old) return old
              return { ...old, data: old.data.filter((m) => m.id !== nonce) }
            }
          )
          return
        }

        // Replace optimistic message with the confirmed one
        pendingNonces.current.delete(nonce)
        queryClient.setQueryData<ListMessagesResponse>(
          ["messages", channelId],
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
      })
    },
    [socket, channelId, queryClient, session]
  )

  if (isPending) {
    return <ChatSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load channel"}
        </span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Channel not found</span>
      </div>
    )
  }

  const context = {
    type: "channel" as const,
    name: data.name ?? channelId,
    topic: data.topic ?? undefined,
  }

  const mentionCandidates =
    guildMembersData?.members.map((member) => ({
      id: member.userId,
      label: member.displayUsername ?? member.username ?? member.name,
      name: member.name,
      username: member.username,
      displayUsername: member.displayUsername,
      image: member.image,
    })) ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader context={context} />
      <MessageList
        context={context}
        messages={messagesData?.data ?? []}
        isLoading={messagesLoading}
      />
      <MessageInput
        context={context}
        onSend={handleSend}
        currentUserId={session?.user.id}
        mentionCandidates={mentionCandidates}
      />
    </div>
  )
}
