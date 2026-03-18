import { authClient } from "@repo/auth/client"
import {
  type GuildRole,
  isGuildRole,
  roleHasPermissions,
} from "@repo/auth/permissions"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo } from "react"
import { useDropzone } from "react-dropzone"
import { ChatSkeleton } from "@/components/chat/chat-skeleton"
import { MessageInput } from "@/components/chat/composer/message-input"
import { DropZoneOverlay } from "@/components/chat/drop-zone-overlay"
import { ChatHeader } from "@/components/chat/header"
import { MessageList } from "@/components/chat/message-list"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"
import { useSocket } from "@/context/socket-context"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useMessageDeletion } from "@/hooks/use-message-deletion"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { useMessagePinning } from "@/hooks/use-message-pinning"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { useReplyState } from "@/hooks/use-reply-state"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { apiClient } from "@/lib/api-client"
import type { ListMessagesResponse } from "@/lib/api-types"

export const Route = createFileRoute("/_authenticated/$guildSlug/$channelId")({
  component: ChannelView,
})

function ChannelView() {
  const { guildSlug, channelId } = Route.useParams()
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { view, setView, clearView } = useRightSidebar()
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

  const { handleDelete } = useMessageDeletion<ListMessagesResponse>({
    socket,
    queryClient,
    channelId,
  })

  const { handleEdit } = useMessageEditing<ListMessagesResponse>({
    socket,
    queryClient,
    channelId,
  })

  const { handleSend } = useMessageSending<ListMessagesResponse>({
    socket,
    queryClient,
    channelId,
    currentUser: session?.user,
  })

  const { data: activeMember } = useQuery({
    queryKey: ["active-guild-member", guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMember()
      if (res.error) return null
      return res.data
    },
  })

  const canPin =
    typeof activeMember?.role === "string" &&
    isGuildRole(activeMember.role) &&
    roleHasPermissions(activeMember.role as GuildRole, { message: ["pin"] })

  const { handleTogglePin } = useMessagePinning<ListMessagesResponse>({
    socket,
    queryClient,
    channelId,
    guildSlug,
  })

  const togglePinnedMessages = useCallback(() => {
    if (view?.type === "pinned-messages") {
      setView({ type: "guild-members", guildSlug, channelId })
    } else {
      setView({ type: "pinned-messages", guildSlug, channelId })
    }
  }, [view, setView, guildSlug, channelId])

  const { replyingTo, setReplyingTo, clearReply } = useReplyState()

  const { typingUsers, emitTyping } = useTypingIndicator({
    socket,
    channelId,
    currentUserId,
  })

  // Clear reply state when switching channels
  useEffect(() => {
    clearReply()
  }, [channelId, clearReply])

  const fileUpload = useFileUpload(channelId)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        void fileUpload.addFiles(acceptedFiles)
      }
    },
    [fileUpload.addFiles]
  )

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
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
    <div
      {...getRootProps()}
      className="relative flex h-full flex-col overflow-hidden"
    >
      <DropZoneOverlay isDragActive={isDragActive} />
      <ChatHeader
        context={context}
        onTogglePinnedMessages={togglePinnedMessages}
      />
      <MessageList
        context={context}
        messages={messagesData?.data ?? []}
        currentUserId={currentUserId}
        onReact={handleReact}
        onReply={setReplyingTo}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onTogglePin={handleTogglePin}
        canPin={canPin}
        mentionCandidates={mentionCandidates}
        isLoading={messagesLoading}
      />
      <TypingIndicator users={typingUsers} />
      <MessageInput
        context={context}
        onSend={handleSend}
        currentUserId={currentUserId}
        mentionCandidates={mentionCandidates}
        replyingTo={replyingTo}
        onCancelReply={clearReply}
        pendingAttachments={fileUpload.attachments}
        addFiles={fileUpload.addFiles}
        removeAttachment={fileUpload.removeAttachment}
        clearAttachments={fileUpload.clearAttachments}
        getUploadedAttachments={fileUpload.getUploadedAttachments}
        isUploading={fileUpload.isUploading}
        onTyping={emitTyping}
      />
    </div>
  )
}
