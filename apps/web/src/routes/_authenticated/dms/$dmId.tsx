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
import { useSocket } from "@/context/socket-context"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useMessageDeletion } from "@/hooks/use-message-deletion"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { useReplyState } from "@/hooks/use-reply-state"
import { apiClient } from "@/lib/api-client"
import type { ListDMMessagesResponse } from "@/lib/api-types"

export const Route = createFileRoute("/_authenticated/dms/$dmId")({
  component: DMConversation,
})

function DMConversation() {
  const { dmId } = Route.useParams()
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id

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
  })

  const { handleDelete } = useMessageDeletion<ListDMMessagesResponse>({
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
      <ChatHeader context={context} />
      <MessageList
        context={context}
        messages={messagesData?.data ?? []}
        currentUserId={currentUserId}
        onReact={handleReact}
        onReply={setReplyingTo}
        onDelete={handleDelete}
        isLoading={messagesLoading}
      />
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
      />
    </div>
  )
}
