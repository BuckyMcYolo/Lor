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
import { useMerlinStream } from "@/hooks/use-merlin-stream"
import { useMessageDeletion } from "@/hooks/use-message-deletion"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { useMessagePinning } from "@/hooks/use-message-pinning"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { useReplyState } from "@/hooks/use-reply-state"
import { useThreadActivity } from "@/hooks/use-thread-activity"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { apiClient } from "@/lib/api-client"
import { writeLastChannelId } from "@/lib/last-location"
import { canPinMessages } from "@/lib/permissions"

type ChannelSearchParams = {
  msgId?: string
  // Persists the open thread so a refresh reopens the right-panel thread.
  threadId?: string
}

export const Route = createFileRoute(
  "/_authenticated/$workspaceSlug/$channelId"
)({
  component: ChannelView,
  validateSearch: (search: Record<string, unknown>): ChannelSearchParams => ({
    msgId: typeof search.msgId === "string" ? search.msgId : undefined,
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
  }),
})

function ChannelView() {
  const { workspaceSlug, channelId } = Route.useParams()
  const { msgId, threadId } = Route.useSearch()
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
    writeLastChannelId(workspaceSlug, channelId)
  }, [workspaceSlug, channelId])

  // Read the current threadId without re-running the mount effect on its
  // changes (runtime open/close is driven by the URL-sync effect below).
  const threadIdRef = useRef(threadId)
  threadIdRef.current = threadId

  // Set the initial right-panel view when entering a channel: reopen the
  // thread from the URL (refresh / deep link) or fall back to members.
  useEffect(() => {
    if (isMobile === false) {
      const initialThreadId = threadIdRef.current
      setView(
        initialThreadId
          ? {
              type: "thread",
              workspaceSlug,
              channelId,
              threadRootId: initialThreadId,
            }
          : { type: "workspace-members", workspaceSlug, channelId }
      )
    }
    return () => {
      clearView()
    }
  }, [setView, clearView, workspaceSlug, channelId, isMobile])

  // Keep ?threadId in step with the panel so a refresh restores it and closing
  // the thread drops it. Mirrors view → URL (the mount effect does URL → view).
  useEffect(() => {
    if (isMobile !== false) return
    if (view?.type === "thread") {
      if (view.threadRootId !== threadId) {
        void navigate({
          search: (prev) => ({ ...prev, threadId: view.threadRootId }),
          replace: true,
        })
      }
    } else if (view && threadId) {
      // Only clear once a real non-thread view is set — `view === null` is the
      // pre-hydration state on refresh and must not wipe the URL's threadId.
      void navigate({
        search: (prev) => ({ ...prev, threadId: undefined }),
        replace: true,
      })
    }
  }, [view, threadId, isMobile, navigate])

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

  // Tracking by id (not a bool) re-triggers on a new msgId while ignoring
  // re-renders for the same one.
  const lastScrolledMsgIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!msgId) {
      lastScrolledMsgIdRef.current = null
      return
    }
    if (lastScrolledMsgIdRef.current === msgId) return
    if (messagesLoading || !messages.length) return
    const timer = setTimeout(() => {
      if (scrollToMessage(msgId)) {
        lastScrolledMsgIdRef.current = msgId
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
      // Already on screen — just scroll. (Common for replies + same-channel.)
      if (scrollToMessage(messageId)) return
      // Otherwise resolve the message's channel (it may live elsewhere — e.g. a
      // Merlin citation to another channel) and navigate there to anchor on it.
      void (async () => {
        try {
          const res = await apiClient.v1.workspaces[":workspaceSlug"].messages[
            ":messageId"
          ].$get({ param: { workspaceSlug, messageId } })
          if (res.ok) {
            const loc = await res.json()
            await navigate({
              to: "/$workspaceSlug/$channelId",
              params: { workspaceSlug, channelId: loc.channelId },
              search: { msgId: messageId },
            })
            return
          }
        } catch {
          // fall through to a best-effort anchor in the current channel
        }
        void navigate({ search: { msgId: messageId } })
      })()
    },
    [navigate, workspaceSlug]
  )

  const handleOpenThread = useCallback(
    (rootMessageId: string) => {
      setView({
        type: "thread",
        workspaceSlug,
        channelId,
        threadRootId: rootMessageId,
      })
      if (isCollapsed) toggleCollapsed()
    },
    [setView, workspaceSlug, channelId, isCollapsed, toggleCollapsed]
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

  useMerlinStream({ socket, queryClient, channelId })

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

  const { data: threadActivityData } = useQuery({
    queryKey: ["thread-activity", channelId],
    enabled: !!data,
    // Seed on channel open; don't resurrect dismissed cards on tab refocus.
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
        ":channelId"
      ]["thread-activity"].$get({
        param: { workspaceSlug, channelId },
      })
      if (!res.ok) throw new Error("Failed to fetch thread activity")
      return res.json()
    },
  })

  // On leaving a channel, drop its cached thread activity so a just-read card
  // doesn't flash on return — the next visit refetches fresh from the server.
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ["thread-activity", channelId] })
    }
  }, [channelId, queryClient])

  const threadActivitySeed = useMemo(
    () =>
      threadActivityData?.data.map((item) => ({
        threadRootId: item.threadRootId,
        replyCount: item.replyCount,
        lastReplyAt: item.lastReplyAt,
        participants: item.participants,
        lastReply: {
          content: item.lastReply.content,
          authorName:
            item.lastReply.author.displayUsername ?? item.lastReply.author.name,
          hasAttachments: item.lastReply.hasAttachments,
          mentions: item.lastReply.mentions,
        },
      })),
    [threadActivityData]
  )

  const { activities: threadActivities, dismiss: dismissThreadActivity } =
    useThreadActivity({
      socket,
      channelId,
      seed: threadActivitySeed,
      suppressThreadRootId: view?.type === "thread" ? view.threadRootId : null,
    })

  const handleOpenThreadActivity = useCallback(
    (threadRootId: string) => {
      handleOpenThread(threadRootId)
      dismissThreadActivity(threadRootId)
    },
    [handleOpenThread, dismissThreadActivity]
  )

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
        onReplyInThread={(msg) => handleOpenThread(msg.id)}
        onOpenThread={handleOpenThread}
        threadActivities={isAtPresent ? threadActivities : []}
        onOpenThreadActivity={handleOpenThreadActivity}
        onDismissThreadActivity={dismissThreadActivity}
        replyingToId={replyingTo?.id ?? null}
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
