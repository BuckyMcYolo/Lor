import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { differenceInMinutes, isSameDay } from "@repo/utils/date"
import { Hash, Loader2, User, Users } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Message } from "@/lib/api-types"
import type { MentionCandidate } from "./composer/mention-types"
import { DateDivider } from "./date-divider"
import type { ChatContext } from "./header"
import { MessageItem } from "./message-item"

interface MessageListProps {
  context: ChatContext
  messages: Message[]
  currentUserId?: string
  blockedUserIds?: Set<string>
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void
  canPin?: boolean
  mentionCandidates?: MentionCandidate[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  isFetchingMore?: boolean
}

function EmptyState({ context }: { context: ChatContext }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-end px-4 pb-4">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/10">
        {context.type === "channel" && (
          <Hash className="size-8 text-foreground/60" />
        )}
        {context.type === "dm" && (
          <User className="size-8 text-foreground/60" />
        )}
        {context.type === "group_dm" && (
          <Users className="size-8 text-foreground/60" />
        )}
      </div>
      <h2 className="text-xl font-bold">
        {context.type === "channel"
          ? `Welcome to #${context.name}!`
          : `This is the beginning of your conversation with ${context.name}`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {context.type === "channel"
          ? "This is the start of the channel."
          : "Send a message to get started."}
      </p>
    </div>
  )
}

const MESSAGE_SKELETON_GROUPS = [
  { key: "a", nameWidth: "5rem", lines: ["80%", "45%"] },
  { key: "b", nameWidth: "6.5rem", lines: ["60%"] },
  { key: "c", nameWidth: "4rem", lines: ["90%", "70%", "35%"] },
  { key: "d", nameWidth: "5.5rem", lines: ["50%"] },
  { key: "e", nameWidth: "7rem", lines: ["75%", "55%"] },
  { key: "f", nameWidth: "4.5rem", lines: ["65%"] },
  { key: "g", nameWidth: "6rem", lines: ["85%", "40%"] },
]
const MESSAGE_GROUP_WINDOW_MINUTES = 5

export function MessageList({
  context,
  messages,
  currentUserId,
  blockedUserIds,
  onReact,
  onReply,
  onDelete,
  onEdit,
  onTogglePin,
  canPin,
  mentionCandidates,
  isLoading,
  hasMore,
  onLoadMore,
  isFetchingMore,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)
  const prevNewestId = useRef<string | null>(null)
  const [stickyDate, setStickyDate] = useState<string | null>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // flex-col-reverse: scrollTop is 0 at bottom, negative when scrolled up
    isNearBottom.current = Math.abs(el.scrollTop) < 150

    // Determine which date divider has scrolled past the top
    const containerTop = el.getBoundingClientRect().top
    const dividers = el.querySelectorAll("[data-date-divider]")
    let topDate: string | null = null

    for (const divider of dividers) {
      const rect = divider.getBoundingClientRect()
      if (rect.bottom < containerTop + 8) {
        topDate = (divider as HTMLElement).dataset.dateDivider ?? null
        break
      }
    }

    setStickyDate(topDate)
  }, [])

  // Auto-scroll only for new messages (not for older page loads)
  useEffect(() => {
    const newestId = messages[0]?.id ?? null
    if (prevNewestId.current === null || isNearBottom.current) {
      if (newestId !== prevNewestId.current) {
        scrollRef.current?.scrollTo({ top: 0 })
      }
    }
    prevNewestId.current = newestId
  }, [messages])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || !hasMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore) {
          onLoadMore()
        }
      },
      { root: container, rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, isFetchingMore])

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col-reverse overflow-hidden py-4">
        {MESSAGE_SKELETON_GROUPS.map((group) => (
          <div key={group.key} className="px-4 py-0.5">
            <div className="flex gap-3">
              <Skeleton className="mt-0.5 size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-baseline gap-2">
                  <Skeleton
                    className="h-3.5 rounded"
                    style={{ width: group.nameWidth }}
                  />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
                {group.lines.map((width, i) => (
                  <Skeleton
                    key={`${group.key}-${i}`}
                    className="h-3.5 rounded"
                    style={{ width }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return <EmptyState context={context} />
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "pointer-events-none absolute top-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm transition-all duration-300 ease-out",
          stickyDate ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        )}
      >
        {stickyDate}
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        data-message-scroll
        className="flex flex-1 select-text flex-col-reverse overflow-y-auto py-4"
      >
        {messages.map((msg, i) => {
          const next = messages[i + 1]
          const isDateBoundary =
            !next || !isSameDay(msg.createdAt, next.createdAt)
          const isWithinGroupWindow =
            !!next &&
            differenceInMinutes(msg.createdAt, next.createdAt) <=
              MESSAGE_GROUP_WINDOW_MINUTES
          const showHeader =
            isDateBoundary ||
            !next ||
            next.authorId !== msg.authorId ||
            !isWithinGroupWindow ||
            msg.type === "reply"

          return (
            <div key={msg.id}>
              {isDateBoundary && <DateDivider date={msg.createdAt} />}
              <MessageItem
                message={msg}
                showHeader={showHeader}
                currentUserId={currentUserId}
                isBlocked={blockedUserIds?.has(msg.authorId) ?? false}
                onReact={onReact}
                onReply={onReply}
                onDelete={onDelete}
                onEdit={onEdit}
                onTogglePin={onTogglePin}
                canPin={canPin}
                mentionCandidates={mentionCandidates}
              />
            </div>
          )
        })}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {isFetchingMore && (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function scrollToMessage(messageId: string) {
  const el = document.querySelector(`[data-message-id="${messageId}"]`)
  if (!el || !(el instanceof HTMLElement)) return false
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.add("bg-primary/10")
  setTimeout(() => el.classList.remove("bg-primary/10"), 2000)
  return true
}
