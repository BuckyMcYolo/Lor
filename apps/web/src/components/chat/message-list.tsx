import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { differenceInMinutes, isSameDay } from "@repo/utils/date"
import { ArrowDown, Hash, Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { MentionCandidate } from "@/components/chat/composer/mention-types"
import { DateDivider } from "@/components/chat/date-divider"
import type { ChatContext } from "@/components/chat/header"
import { MessageItem } from "@/components/chat/message-item"
import { ThreadActivityStack } from "@/components/chat/thread-activity"
import type { ThreadActivity } from "@/hooks/use-thread-activity"
import type { Message } from "@/lib/api-types"

interface MessageListProps {
  context: ChatContext
  messages: Message[]
  currentUserId?: string
  blockedUserIds?: Set<string>
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onReplyInThread?: (message: Message) => void
  onOpenThread?: (rootMessageId: string) => void
  replyingToId?: string | null
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void
  canPin?: boolean
  mentionCandidates?: MentionCandidate[]
  isLoading?: boolean
  hasOlder?: boolean
  onLoadOlder?: () => void
  isFetchingOlder?: boolean
  hasNewer?: boolean
  onLoadNewer?: () => void
  isFetchingNewer?: boolean
  /**
   * Number of live messages received while the user is viewing older
   * context. Shown on the Jump-to-present pill so they know how many they're
   * behind on (Discord/Slack pattern).
   */
  pendingCount?: number
  onJumpToPresent?: () => void
  /**
   * Clicking a reply preview / citation jumps to the referenced message id.
   * The route translates this into URL-anchor navigation; MessageList just
   * forwards the click.
   */
  onJumpToMessage?: (messageId: string) => void
  /**
   * Fresh thread replies surfaced as collapsed cards at the bottom of the feed.
   * Clicking a card opens the thread (and the parent dismisses it).
   */
  threadActivities?: ThreadActivity[]
  onOpenThreadActivity?: (threadRootId: string) => void
  onDismissThreadActivity?: (threadRootId: string) => void
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

function EmptyState({ context }: { context: ChatContext }) {
  return (
    <div className="flex flex-1 flex-col justify-end px-6 pb-4">
      <div className="flex flex-col items-start gap-3">
        {context.type === "channel" ? (
          <div className="flex size-14 items-center justify-center rounded-full bg-accent text-foreground">
            <Hash className="size-7" strokeWidth={2.25} />
          </div>
        ) : (
          <Avatar className="size-14">
            {context.type === "dm" && context.avatarUrl && (
              <AvatarImage src={context.avatarUrl} alt={context.name} />
            )}
            <AvatarFallback className="text-lg font-semibold">
              {nameInitial(context.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <h3 className="text-2xl font-extrabold">
            {context.type === "channel"
              ? `Welcome to #${context.name}!`
              : context.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {context.type === "channel"
              ? `This is the start of the #${context.name} channel.`
              : context.type === "dm"
                ? `This is the beginning of your direct message history with ${context.name}.`
                : `This is the beginning of your group conversation.`}
          </p>
        </div>
      </div>
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
  onReplyInThread,
  onOpenThread,
  onDelete,
  onEdit,
  onTogglePin,
  canPin,
  mentionCandidates,
  isLoading,
  hasOlder,
  onLoadOlder,
  isFetchingOlder,
  hasNewer,
  onLoadNewer,
  isFetchingNewer,
  pendingCount = 0,
  onJumpToPresent,
  onJumpToMessage,
  replyingToId,
  threadActivities,
  onOpenThreadActivity,
  onDismissThreadActivity,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const olderSentinelRef = useRef<HTMLDivElement>(null)
  const newerSentinelRef = useRef<HTMLDivElement>(null)
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

  // IntersectionObserver for fetching older (top of viewport)
  useEffect(() => {
    const sentinel = olderSentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || !hasOlder || !onLoadOlder) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingOlder) {
          onLoadOlder()
        }
      },
      { root: container, rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasOlder, onLoadOlder, isFetchingOlder])

  // IntersectionObserver for fetching newer (bottom of viewport — only
  // active in anchored mode, where the user is looking at older context)
  useEffect(() => {
    const sentinel = newerSentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || !hasNewer || !onLoadNewer) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNewer) {
          onLoadNewer()
        }
      },
      { root: container, rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNewer, onLoadNewer, isFetchingNewer])

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

  // The Jump-to-present pill shows when there are buffered live messages OR
  // the user is in anchored mode with newer messages to fetch.
  const showJumpToPresent =
    !!onJumpToPresent && (pendingCount > 0 || !!hasNewer)

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
        {/* Thread-activity cards sit at the visual bottom (DOM-first because
            col-reverse), just below the newest message. */}
        {threadActivities &&
          threadActivities.length > 0 &&
          onOpenThreadActivity &&
          onDismissThreadActivity && (
            <div className="pt-1.5">
              <ThreadActivityStack
                activities={threadActivities}
                onOpen={onOpenThreadActivity}
                onDismiss={onDismissThreadActivity}
              />
            </div>
          )}
        {/* Sentinel at the visual bottom (DOM-first because col-reverse). */}
        {hasNewer && (
          <div ref={newerSentinelRef} className="flex justify-center py-3">
            {isFetchingNewer && (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
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
                onReplyInThread={onReplyInThread}
                onOpenThread={onOpenThread}
                isReplyTarget={replyingToId === msg.id}
                onDelete={onDelete}
                onEdit={onEdit}
                onTogglePin={onTogglePin}
                canPin={canPin}
                mentionCandidates={mentionCandidates}
                onJumpToMessage={onJumpToMessage}
              />
            </div>
          )
        })}
        {/* Sentinel at the visual top. */}
        {hasOlder && (
          <div ref={olderSentinelRef} className="flex justify-center py-3">
            {isFetchingOlder && (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {showJumpToPresent && (
        <button
          type="button"
          onClick={onJumpToPresent}
          className="absolute right-4 bottom-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-md transition hover:bg-accent"
        >
          {pendingCount > 0
            ? `${pendingCount} new message${pendingCount === 1 ? "" : "s"}`
            : "Jump to present"}
          <ArrowDown className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

const HIGHLIGHT_HOLD_MS = 3500
const HIGHLIGHT_FADE_MS = 1200
const REANCHOR_START_DELAY_MS = 350
const REANCHOR_WINDOW_MS = 6000

/** Scrolls a message into view and keeps it centered against late layout shifts. */
export function scrollToMessage(messageId: string): boolean {
  // Scope to the channel feed's scroll container so we don't match the thread
  // panel's duplicate copy of the same message (it has no [data-message-scroll]).
  const el = document.querySelector(
    `[data-message-scroll] [data-message-id="${messageId}"]`
  ) as HTMLElement | null
  if (!el) return false

  const scrollContainer = el.closest(
    "[data-message-scroll]"
  ) as HTMLElement | null
  if (!scrollContainer) return false

  const computeOffset = () => {
    const containerRect = scrollContainer.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    return (
      elRect.top -
      containerRect.top -
      containerRect.height / 2 +
      elRect.height / 2
    )
  }

  scrollContainer.scrollBy({ top: computeOffset(), behavior: "smooth" })

  // Defer observer setup until smooth scroll finishes (avoids mid-animation yanks).
  const startObserverTimer = window.setTimeout(() => {
    let cancelled = false
    let rafScheduled = false

    const recenter = () => {
      if (cancelled) return
      const offset = computeOffset()
      if (Math.abs(offset) < 1) return
      scrollContainer.scrollBy({ top: offset, behavior: "auto" })
    }

    // Coalesce bursts of observer fires into one recenter per frame.
    const scheduleRecenter = () => {
      if (cancelled || rafScheduled) return
      rafScheduled = true
      requestAnimationFrame(() => {
        rafScheduled = false
        recenter()
      })
    }

    const resizeObserver = new ResizeObserver(scheduleRecenter)
    const observeAll = () => {
      const messageEls =
        scrollContainer.querySelectorAll<HTMLElement>("[data-message-id]")
      for (const msgEl of messageEls) {
        resizeObserver.observe(msgEl)
      }
    }
    observeAll()

    // Observe messages added later (fetchOlder/fetchNewer pages).
    const mutationObserver = new MutationObserver((mutations) => {
      let needsRecenter = false
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.dataset?.messageId) {
            resizeObserver.observe(node)
            needsRecenter = true
          }
          const nested =
            node.querySelectorAll?.<HTMLElement>("[data-message-id]")
          if (nested?.length) {
            for (const n of nested) resizeObserver.observe(n)
            needsRecenter = true
          }
        }
      }
      if (needsRecenter) scheduleRecenter()
    })
    mutationObserver.observe(scrollContainer, {
      childList: true,
      subtree: true,
    })

    const cleanup = () => {
      if (cancelled) return
      cancelled = true
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      scrollContainer.removeEventListener("wheel", onUserInput)
      scrollContainer.removeEventListener("touchmove", onUserInput)
      window.removeEventListener("keydown", onKeyDown)
    }

    const onUserInput = () => cleanup()
    const onKeyDown = (e: KeyboardEvent) => {
      // Only bail on scroll-causing keys (typing elsewhere shouldn't tear down).
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "PageUp" ||
        e.key === "PageDown" ||
        e.key === "Home" ||
        e.key === "End" ||
        e.key === " "
      ) {
        cleanup()
      }
    }
    scrollContainer.addEventListener("wheel", onUserInput, { passive: true })
    scrollContainer.addEventListener("touchmove", onUserInput, {
      passive: true,
    })
    window.addEventListener("keydown", onKeyDown)

    window.setTimeout(cleanup, REANCHOR_WINDOW_MS)
  }, REANCHOR_START_DELAY_MS)

  el.style.transition = "background-color 0.3s ease"
  el.style.backgroundColor =
    "color-mix(in oklch, var(--primary) 15%, transparent)"
  window.setTimeout(() => {
    el.style.transition = `background-color ${HIGHLIGHT_FADE_MS}ms ease-out`
    el.style.backgroundColor = ""
  }, HIGHLIGHT_HOLD_MS)
  window.setTimeout(
    () => {
      el.style.transition = ""
    },
    HIGHLIGHT_HOLD_MS + HIGHLIGHT_FADE_MS + 100
  )

  void startObserverTimer
  return true
}
