import { authClient } from "@repo/auth/client"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { ChatSkeleton } from "@/components/chat/chat-skeleton"
import { MessageInput } from "@/components/chat/composer/message-input"
import { DropZoneOverlay } from "@/components/chat/drop-zone-overlay"
import { ChatHeader } from "@/components/chat/header"
import { MessageList, scrollToMessage } from "@/components/chat/message-list"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"
import { useSocket } from "@/context/socket-context"
import { useAutoMarkRead } from "@/hooks/use-auto-mark-read"
import { useChannelMessages } from "@/hooks/use-channel-messages"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useMessageDeletion } from "@/hooks/use-message-deletion"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { useMessagePinning } from "@/hooks/use-message-pinning"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { useReplyState } from "@/hooks/use-reply-state"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { apiClient } from "@/lib/api-client"
import { canPinMessages } from "@/lib/permissions"

type ChannelSearchParams = {
  msgId?: string
}

export const Route = createFileRoute(
  "/_authenticated/$workspaceSlug/$channelId"
)({
  component: ChannelView,
  validateSearch: (search: Record<string, unknown>): ChannelSearchParams => ({
    msgId: typeof search.msgId === "string" ? search.msgId : undefined,
  }),
})

function ChannelView() {
  const { workspaceSlug, channelId } = Route.useParams()
  const { msgId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const socket = useSocket()
  const isMobile = useIsMobile()
  useAutoMarkRead(channelId)
  const queryClient = useQueryClient()
  const { view, setView, clearView, isCollapsed, toggleCollapsed } =
    useRightSidebar()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id

  useEffect(() => {
    if (!workspaceSlug || !channelId) return
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`last-channel:${workspaceSlug}`, channelId)
      }
    } catch {
      // localStorage may be unavailable in restricted environments
    }
  }, [workspaceSlug, channelId])

  useEffect(() => {
    if (isMobile === false) {
      setView({
        type: "workspace-members",
        workspaceSlug,
        channelId,
      })
    }
    return () => {
      clearView()
    }
  }, [setView, clearView, workspaceSlug, channelId, isMobile])

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["channel", workspaceSlug, channelId],
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
        ":channelId"
      ].$get({
        param: { workspaceSlug, channelId },
      })
      if (!res.ok) throw new Error("Failed to fetch channel")
      return res.json()
    },
  })

  const fetchMessagesPage = useCallback(
    async (params: {
      around?: string
      before?: string
      after?: string
      limit: number
    }) => {
      const query: Record<string, string> = { limit: String(params.limit) }
      if (params.around) query.around = params.around
      if (params.before) query.before = params.before
      if (params.after) query.after = params.after
      const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
        ":channelId"
      ].messages.$get({
        param: { workspaceSlug, channelId },
        query,
      })
      if (!res.ok) throw new Error("Failed to fetch messages")
      return res.json()
    },
    [workspaceSlug, channelId]
  )

  const { handleSend, pendingNonces } = useMessageSending({
    socket,
    queryClient,
    channelId,
    currentUser: session?.user,
  })

  const {
    messages,
    isLoading: messagesLoading,
    fetchOlder,
    fetchNewer,
    hasOlder,
    hasNewer,
    isFetchingOlder,
    isFetchingNewer,
    isAtPresent,
    pendingCount,
    clearPending,
  } = useChannelMessages({
    channelId,
    anchor: msgId,
    fetchPage: fetchMessagesPage,
    enabled: !!data,
    socket,
    pendingNoncesRef: pendingNonces,
  })

  // After the anchored page renders, scroll the requested message into view
  // and apply the highlight effect. We track that we've scrolled with a ref
  // so subsequent page fetches (older/newer) don't yank the user back.
  const didScrollToAnchorRef = useRef(false)
  useEffect(() => {
    if (!msgId) {
      didScrollToAnchorRef.current = false
      return
    }
    if (didScrollToAnchorRef.current) return
    if (messagesLoading || !messages.length) return
    const timer = setTimeout(() => {
      if (scrollToMessage(msgId)) {
        didScrollToAnchorRef.current = true
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [msgId, messagesLoading, messages.length])

  const handleJumpToPresent = useCallback(() => {
    clearPending()
    void navigate({ search: {}, replace: true })
  }, [clearPending, navigate])

  const handleJumpToMessage = useCallback(
    (messageId: string) => {
      // Try local scroll first — if the target is already on screen, no
      // refetch is needed.
      if (scrollToMessage(messageId)) return
      void navigate({ search: { msgId: messageId } })
    },
    [navigate]
  )

  const { data: workspaceMembersData } = useQuery({
    queryKey: ["workspace-members", workspaceSlug],
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].members.$get({
        param: { workspaceSlug },
      })
      if (!res.ok) throw new Error("Failed to fetch workspace members")
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

  const { handleReact } = useMessageReactions({
    socket,
    queryClient,
    channelId,
    currentUserId,
    currentUserName: session?.user.name,
  })

  const { handleDelete } = useMessageDeletion({
    socket,
    queryClient,
    channelId,
  })

  const { handleEdit } = useMessageEditing({
    socket,
    queryClient,
    channelId,
  })

  const { data: activeMember } = useQuery({
    queryKey: ["active-workspace-member", workspaceSlug],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMember()
      if (res.error) return null
      return res.data
    },
  })

  const activeMemberCtx =
    typeof activeMember?.role === "string" &&
    typeof activeMember.userId === "string" &&
    workspaceMembersData?.ownerId
      ? {
          actor: { userId: activeMember.userId, role: activeMember.role },
          workspace: { ownerId: workspaceMembersData.ownerId },
        }
      : null

  const canPin = activeMemberCtx
    ? canPinMessages(activeMemberCtx.actor, activeMemberCtx.workspace)
    : false

  const { handleTogglePin } = useMessagePinning({
    socket,
    queryClient,
    channelId,
    workspaceSlug,
  })

  const togglePinnedMessages = useCallback(() => {
    if (view?.type === "pinned-messages" && !isCollapsed) {
      setView({ type: "workspace-members", workspaceSlug, channelId })
    } else {
      setView({ type: "pinned-messages", workspaceSlug, channelId })
      if (isCollapsed) {
        toggleCollapsed()
      }
    }
  }, [view, setView, workspaceSlug, channelId, isCollapsed, toggleCollapsed])

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
      ...(workspaceMembersData?.members.map((member) => ({
        id: member.userId,
        label: member.displayUsername ?? member.username ?? member.name,
        name: member.name,
        username: member.username,
        displayUsername: member.displayUsername,
        image: member.image,
      })) ?? []),
    ],
    [workspaceMembersData?.members]
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
        channelId={channelId}
        onTogglePinnedMessages={togglePinnedMessages}
      />
      <MessageList
        context={context}
        messages={messages}
        hasOlder={hasOlder}
        onLoadOlder={() => fetchOlder()}
        isFetchingOlder={isFetchingOlder}
        hasNewer={hasNewer}
        onLoadNewer={() => fetchNewer()}
        isFetchingNewer={isFetchingNewer}
        pendingCount={pendingCount}
        onJumpToPresent={isAtPresent ? undefined : handleJumpToPresent}
        onJumpToMessage={handleJumpToMessage}
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
