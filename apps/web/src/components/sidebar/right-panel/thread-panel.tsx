import { MessageMultiple01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { authClient } from "@repo/auth/client"
import { Skeleton } from "@repo/ui/components/skeleton"
import { SidebarToggleIcon } from "@repo/ui/components/unlumen-ui/sidebar-toggle-icon"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { differenceInMinutes, isSameDay } from "@repo/utils/date"
import {
  type InfiniteData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ArrowLeft, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { MessageInput } from "@/components/chat/composer/message-input"
import { MessageItem } from "@/components/chat/message-item"
import { useSocket } from "@/context/socket-context"
import { useFileUpload } from "@/hooks/use-file-upload"
import { useMessageDeletion } from "@/hooks/use-message-deletion"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { useMessageReactions } from "@/hooks/use-message-reactions"
import { useMessageSending } from "@/hooks/use-message-sending"
import { useThreadMessages } from "@/hooks/use-thread-messages"
import { apiClient } from "@/lib/api-client"
import type { Message } from "@/lib/api-types"
import { useRightSidebar } from "./right-sidebar-context"
import type { ThreadSidebarView } from "./right-sidebar-types"

const MESSAGE_GROUP_WINDOW_MINUTES = 5

const THREAD_SKELETON_GROUPS = [
  { key: "a", nameWidth: "4.5rem", lines: ["75%", "40%"] },
  { key: "b", nameWidth: "6rem", lines: ["55%"] },
  { key: "c", nameWidth: "4rem", lines: ["85%", "30%"] },
  { key: "d", nameWidth: "5.5rem", lines: ["50%"] },
]

type ChannelMessagesCache = InfiniteData<{ data: Message[] }> | undefined

function findMessageInChannelCache(
  cache: ChannelMessagesCache,
  messageId: string
): Message | null {
  if (!cache) return null
  for (const page of cache.pages) {
    const found = page.data.find((m) => m.id === messageId)
    if (found) return found
  }
  return null
}

export function ThreadPanel({ view }: { view: ThreadSidebarView }) {
  const { setView, toggleCollapsed, clearView } = useRightSidebar()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const socket = useSocket()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id

  const goBack = () => {
    setView({
      type: "workspace-members",
      workspaceSlug: view.workspaceSlug,
      channelId: view.channelId,
    })
  }

  // Subscribe to the channel cache so the root reflects edits, reactions,
  // and embed unfurls while the thread panel is open. The channel feed hook
  // (in the main view) owns the actual fetch — we just read here.
  const { data: channelCache } = useQuery<ChannelMessagesCache>({
    queryKey: ["messages", view.channelId],
    enabled: false,
  })
  const rootMessage = useMemo(
    () => findMessageInChannelCache(channelCache, view.threadRootId),
    [channelCache, view.threadRootId]
  )

  const fetchThreadPage = useCallback(
    async (params: { before?: string; after?: string; limit: number }) => {
      const query: Record<string, string> = { limit: String(params.limit) }
      if (params.before) query.before = params.before
      if (params.after) query.after = params.after
      const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
        ":channelId"
      ].messages[":messageId"].thread.$get({
        param: {
          workspaceSlug: view.workspaceSlug,
          channelId: view.channelId,
          messageId: view.threadRootId,
        },
        query,
      })
      if (!res.ok) throw new Error("Failed to fetch thread replies")
      return res.json()
    },
    [view.workspaceSlug, view.channelId, view.threadRootId]
  )

  const { handleSend, pendingNonces } = useMessageSending({
    socket,
    queryClient,
    channelId: view.channelId,
    currentUser: session?.user,
    threadRootId: view.threadRootId,
  })

  const { messages, isLoading, fetchOlder, hasOlder, isFetchingOlder } =
    useThreadMessages({
      channelId: view.channelId,
      threadRootId: view.threadRootId,
      fetchPage: fetchThreadPage,
      socket,
      pendingNoncesRef: pendingNonces,
    })

  const { handleReact } = useMessageReactions({
    socket,
    queryClient,
    channelId: view.channelId,
    currentUserId,
    currentUserName: session?.user.name,
  })
  const { handleDelete } = useMessageDeletion({
    socket,
    queryClient,
    channelId: view.channelId,
  })
  const { handleEdit } = useMessageEditing({
    socket,
    queryClient,
    channelId: view.channelId,
  })

  const fileUpload = useFileUpload(view.channelId)

  const { data: workspaceMembersData } = useQuery({
    queryKey: ["workspace-members", view.workspaceSlug],
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].members.$get({
        param: { workspaceSlug: view.workspaceSlug },
      })
      if (!res.ok) throw new Error("Failed to fetch workspace members")
      return res.json()
    },
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

  // Threads render top-down (oldest → newest). The API + cache hold
  // newest-first, so reverse for display.
  const orderedReplies = useMemo(() => [...messages].reverse(), [messages])

  // Auto-scroll to bottom when new replies arrive, but only if the user is
  // already near the bottom (don't yank them while they're reading older
  // context).
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }, [])
  const lastNewestIdRef = useRef<string | null>(null)
  useEffect(() => {
    const newest = orderedReplies[orderedReplies.length - 1]?.id ?? null
    if (newest === lastNewestIdRef.current) return
    const firstRender = lastNewestIdRef.current === null
    lastNewestIdRef.current = newest
    if (firstRender || isNearBottomRef.current) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [orderedReplies])

  // Load-older sentinel at the top.
  const olderSentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = olderSentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || !hasOlder) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingOlder) {
          void fetchOlder()
        }
      },
      { root: container, rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasOlder, isFetchingOlder, fetchOlder])

  const channelContext = useMemo(
    () => ({
      type: "channel" as const,
      name: "thread",
    }),
    []
  )

  // When older pages are still unloaded, `orderedReplies.length` is just the
  // loaded slice — fall back to the root summary's total. Once `hasOlder` is
  // false the loaded array is the full thread.
  const summaryTotal = rootMessage?.threadSummary?.replyCount
  const dividerCount = hasOlder ? summaryTotal : orderedReplies.length
  const showDivider =
    !isLoading &&
    orderedReplies.length > 0 &&
    dividerCount !== undefined &&
    dividerCount > 0

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <HugeiconsIcon
          icon={MessageMultiple01Icon}
          size={16}
          className="text-muted-foreground"
        />
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Thread
        </span>
        <button
          type="button"
          onClick={isMobile ? clearView : toggleCollapsed}
          aria-label={isMobile ? "Close thread panel" : "Collapse thread panel"}
          className="-mr-1.5 ml-auto flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <SidebarToggleIcon
            isOpen={true}
            className="size-4 -scale-x-100"
            strokeWidth={1.5}
          />
        </button>
      </div>

      <motion.div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
        }}
      >
        {rootMessage && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              },
            }}
            className="pt-2"
          >
            <MessageItem
              message={{ ...rootMessage, threadSummary: null }}
              showHeader={true}
              currentUserId={currentUserId}
              onReact={handleReact}
              onDelete={handleDelete}
              onEdit={handleEdit}
              mentionCandidates={mentionCandidates}
            />
          </motion.div>
        )}

        {showDivider && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-1 text-[12px] text-muted-foreground">
            <span className="font-medium">
              {dividerCount} {dividerCount === 1 ? "reply" : "replies"}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
        )}

        {hasOlder && (
          <div ref={olderSentinelRef} className="flex justify-center py-3">
            {isFetchingOlder && (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {isLoading && orderedReplies.length === 0 ? (
          <div className="flex flex-col py-2">
            {THREAD_SKELETON_GROUPS.map((group) => (
              <div key={group.key} className="px-4 py-1">
                <div className="flex gap-3">
                  <Skeleton className="mt-0.5 size-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <Skeleton
                        className="h-3 rounded"
                        style={{ width: group.nameWidth }}
                      />
                      <Skeleton className="h-2.5 w-10 rounded" />
                    </div>
                    {group.lines.map((width, i) => (
                      <Skeleton
                        key={`${group.key}-${i}`}
                        className="h-3 rounded"
                        style={{ width }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          orderedReplies.map((msg, i) => {
            const prev = orderedReplies[i - 1]
            const isDateBoundary =
              !prev || !isSameDay(msg.createdAt, prev.createdAt)
            const isWithinGroupWindow =
              !!prev &&
              differenceInMinutes(msg.createdAt, prev.createdAt) <=
                MESSAGE_GROUP_WINDOW_MINUTES
            const showHeader =
              isDateBoundary ||
              !prev ||
              prev.authorId !== msg.authorId ||
              !isWithinGroupWindow
            return (
              <motion.div
                key={msg.id}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
              >
                <MessageItem
                  message={msg}
                  showHeader={showHeader}
                  currentUserId={currentUserId}
                  onReact={handleReact}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  mentionCandidates={mentionCandidates}
                />
              </motion.div>
            )
          })
        )}

        {/* Composer sits right under the messages (Slack pattern). When the
            thread is short the extra space falls below the composer instead
            of between it and the last reply. */}
        <div className="mt-2">
          <MessageInput
            context={channelContext}
            placeholder="Reply…"
            onSend={handleSend}
            currentUserId={currentUserId}
            mentionCandidates={mentionCandidates}
            pendingAttachments={fileUpload.attachments}
            addFiles={fileUpload.addFiles}
            removeAttachment={fileUpload.removeAttachment}
            clearAttachments={fileUpload.clearAttachments}
            getUploadedAttachments={fileUpload.getUploadedAttachments}
            isUploading={fileUpload.isUploading}
          />
        </div>
      </motion.div>
    </div>
  )
}
