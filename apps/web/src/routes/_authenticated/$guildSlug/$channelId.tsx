import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { ChatSkeleton } from "@/components/chat/chat-skeleton"
import { MessageInput } from "@/components/chat/composer/message-input"
import { ChatHeader } from "@/components/chat/header"
import { MessageList } from "@/components/chat/message-list"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"
import { useSocket } from "@/context/socket-context"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { apiClient } from "@/lib/api-client"
import type { ListMessagesResponse } from "@/lib/api-types"

export const Route = createFileRoute("/_authenticated/$guildSlug/$channelId")({
  component: ChannelView,
})

function ChannelView() {
  const { guildSlug, channelId } = Route.useParams()
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { setView, clearView } = useRightSidebar()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id

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

  const { handleReact } = useMessageReactions<ListMessagesResponse>({
    socket,
    queryClient,
    channelId,
    currentUserId,
  })

  const { handleSend } = useMessageSending<ListMessagesResponse>({
    socket,
    queryClient,
    channelId,
    currentUser: session?.user,
  })

  const mentionCandidates = useMemo(
    () => [
      {
        id: "everyone",
        label: "everyone",
        name: "everyone",
        search: "everyone all members",
      },
      ...(guildMembersData?.members.map((member) => ({
        id: member.userId,
        label: member.displayUsername ?? member.username ?? member.name,
        name: member.name,
        username: member.username,
        displayUsername: member.displayUsername,
        image: member.image,
      })) ?? []),
    ],
    [guildMembersData?.members]
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader context={context} />
      <MessageList
        context={context}
        messages={messagesData?.data ?? []}
        currentUserId={currentUserId}
        onReact={handleReact}
        isLoading={messagesLoading}
      />
      <MessageInput
        context={context}
        onSend={handleSend}
        currentUserId={currentUserId}
        mentionCandidates={mentionCandidates}
      />
    </div>
  )
}
