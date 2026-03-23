import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { ChatSkeleton } from "@/components/chat/chat-skeleton"
import { MessageInput } from "@/components/chat/composer/message-input"
import { DropZoneOverlay } from "@/components/chat/drop-zone-overlay"
import { ChatHeader } from "@/components/chat/header"
import { MessageList } from "@/components/chat/message-list"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { useSocket } from "@/context/socket-context"
import { useAutoMarkRead } from "@/hooks/use-auto-mark-read"
import { useBlockedUserIds } from "@/hooks/use-blocked-users"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useMessageDeletion } from "@/hooks/use-message-deletion"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { useReplyState } from "@/hooks/use-reply-state"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { apiClient } from "@/lib/api-client"
import type { ListDMMessagesResponse } from "@/lib/api-types"

type DMSearchParams = {
  msgId?: string
}

export const Route = createFileRoute("/_authenticated/dms/$dmId")({
  component: DMConversation,
  validateSearch: (search: Record<string, unknown>): DMSearchParams => ({
    msgId: typeof search.msgId === "string" ? search.msgId : undefined,
  }),
})

function scrollToMessage(messageId: string) {
  const el = document.querySelector(`[data-message-id="${messageId}"]`)
  if (!el) return false
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.add("bg-primary/10")
  setTimeout(() => el.classList.remove("bg-primary/10"), 2000)
  return true
}

function DMConversation() {
  const { dmId } = Route.useParams()
  const { msgId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const socket = useSocket()
  useAutoMarkRead(dmId)
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id
  const blockedUserIds = useBlockedUserIds()

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

  // Scroll to a specific message when navigating from search
  useEffect(() => {
    if (!msgId || messagesLoading || !messagesData?.data.length) return
    const timer = setTimeout(() => {
      if (scrollToMessage(msgId)) {
        void navigate({ search: {}, replace: true })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [msgId, messagesLoading, messagesData, navigate])

  // Join/leave the DM channel room for real-time messages
  useEffect(() => {
    if (!socket) return

    socket.emit("channel:join", { channelId: dmId })

    return () => {
      socket.emit("channel:leave", { channelId: dmId })
    }
  }, [socket, dmId])

  const { handleReact } = useMessageReactions<ListDMMessagesResponse>({
    socket,
    queryClient,
    channelId: dmId,
    currentUserId,
    currentUserName: session?.user.name,
  })

  const { handleDelete } = useMessageDeletion<ListDMMessagesResponse>({
    socket,
    queryClient,
    channelId: dmId,
  })

  const { handleEdit } = useMessageEditing<ListDMMessagesResponse>({
    socket,
    queryClient,
    channelId: dmId,
  })

  const { handleSend } = useMessageSending<ListDMMessagesResponse>({
    socket,
    queryClient,
    channelId: dmId,
    currentUser: session?.user,
  })

  const { replyingTo, setReplyingTo, clearReply } = useReplyState()

  const { typingUsers, emitTyping } = useTypingIndicator({
    socket,
    channelId: dmId,
    currentUserId,
    blockedUserIds,
  })

  // Clear reply state when switching DMs
  useEffect(() => {
    clearReply()
  }, [dmId, clearReply])

  const fileUpload = useFileUpload(dmId)

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

  // For 1:1 DMs, check if the other user is blocked
  const isDirect = dm.type === "dm"
  const otherMemberId = isDirect ? dm.members[0]?.id : undefined
  const isOtherBlocked = otherMemberId
    ? blockedUserIds.has(otherMemberId)
    : false

  const mentionCandidates = dm.members.map((member) => ({
    id: member.id,
    label: member.displayUsername ?? member.username ?? member.name,
    name: member.name,
    username: member.username,
    displayUsername: member.displayUsername,
    image: member.image,
    search: [member.name, member.username, member.displayUsername]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  }))

  return (
    <div
      {...getRootProps()}
      className="relative flex h-full flex-col overflow-hidden"
    >
      <DropZoneOverlay isDragActive={isDragActive} />
      <ChatHeader context={context} channelId={dmId} />
      <MessageList
        context={context}
        messages={messagesData?.data ?? []}
        currentUserId={currentUserId}
        blockedUserIds={blockedUserIds}
        onReact={handleReact}
        onReply={setReplyingTo}
        onDelete={handleDelete}
        onEdit={handleEdit}
        mentionCandidates={mentionCandidates}
        isLoading={messagesLoading}
      />
      <TypingIndicator users={typingUsers} />
      {isOtherBlocked ? (
        <div className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
          You have blocked this user. Unblock them to send messages.
        </div>
      ) : (
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
      )}
    </div>
  )
}
