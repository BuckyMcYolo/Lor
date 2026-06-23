import type { RealtimeMessageThreadUpdated } from "@repo/realtime-types"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Message } from "@/lib/api-types"
import type { AppSocket } from "@/lib/socket"

export interface ThreadActivityReplyPreview {
  content: string | null
  authorName: string
  hasAttachments: boolean
  mentions: Message["mentions"]
}

export interface ThreadActivity {
  threadRootId: string
  replyCount: number
  lastReplyAt: string
  participants: RealtimeMessageThreadUpdated["participants"]
  /** Preview of the newest reply — the activity the card surfaces. */
  lastReply?: ThreadActivityReplyPreview | null
}

interface UseThreadActivityOptions {
  socket: AppSocket | null
  channelId: string
  /** Server-seeded activity for this channel (unread thread replies). */
  seed?: ThreadActivity[]
  /**
   * Thread currently open in the right panel. We never bump it (you're already
   * looking at it) and keep it cleared even after the panel closes.
   */
  suppressThreadRootId?: string | null
}

// Keep the bottom stack small — it surfaces fresh activity, not a full inbox.
const MAX_ACTIVITIES = 3

/**
 * Surfaces fresh thread replies as collapsed cards at the bottom of the
 * channel, so activity buried up in history isn't missed.
 *
 * `activities` is *derived* from two sources rather than a stateful merge:
 *   - `seed`: the server's authoritative unread-thread set on channel open.
 *   - live `message:thread:updated` events that arrive during the visit.
 * Deriving (not merging into state) means an empty/refetched seed correctly
 * clears stale cards instead of resurrecting them. Dismissed/opened threads
 * are filtered out for the rest of the visit.
 */
export function useThreadActivity({
  socket,
  channelId,
  seed,
  suppressThreadRootId,
}: UseThreadActivityOptions) {
  const [live, setLive] = useState<ThreadActivity[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())

  // Both sources are channel-scoped — drop them when the channel changes.
  useEffect(() => {
    setLive([])
    setDismissed(new Set())
  }, [channelId])

  const dismiss = useCallback((threadRootId: string) => {
    setDismissed((prev) => {
      if (prev.has(threadRootId)) return prev
      const next = new Set(prev)
      next.add(threadRootId)
      return next
    })
  }, [])

  // Opening a thread counts as reading it — keep it gone even after the panel
  // closes (a new reply will still re-surface it via the live handler below).
  useEffect(() => {
    if (suppressThreadRootId) dismiss(suppressThreadRootId)
  }, [suppressThreadRootId, dismiss])

  useEffect(() => {
    if (!socket) return

    const handleThreadUpdated = (payload: RealtimeMessageThreadUpdated) => {
      if (payload.channelId !== channelId) return

      setLive((prev) => {
        const rest = prev.filter((a) => a.threadRootId !== payload.threadRootId)
        // Thread emptied (last reply deleted) → drop the live entry.
        if (payload.replyCount === 0 || !payload.lastReplyAt) return rest
        const lastReply: ThreadActivityReplyPreview | null = payload.lastReply
          ? {
              content: payload.lastReply.content,
              authorName:
                payload.lastReply.author.displayUsername ??
                payload.lastReply.author.name,
              hasAttachments: payload.lastReply.hasAttachments,
              mentions: payload.lastReply.mentions,
            }
          : null
        return [
          ...rest,
          {
            threadRootId: payload.threadRootId,
            replyCount: payload.replyCount,
            lastReplyAt: payload.lastReplyAt,
            participants: payload.participants,
            lastReply,
          },
        ]
      })

      // A fresh reply is new activity — un-dismiss so it surfaces again,
      // unless it's the thread you're actively viewing.
      if (payload.threadRootId !== suppressThreadRootId) {
        setDismissed((prev) => {
          if (!prev.has(payload.threadRootId)) return prev
          const next = new Set(prev)
          next.delete(payload.threadRootId)
          return next
        })
      }
    }

    socket.on("message:thread:updated", handleThreadUpdated)
    return () => {
      socket.off("message:thread:updated", handleThreadUpdated)
    }
  }, [socket, channelId, suppressThreadRootId])

  const activities = useMemo(() => {
    const byId = new Map<string, ThreadActivity>()
    for (const a of seed ?? []) byId.set(a.threadRootId, a)
    for (const a of live) {
      const existing = byId.get(a.threadRootId)
      if (!existing || a.lastReplyAt >= existing.lastReplyAt) {
        byId.set(a.threadRootId, a)
      }
    }
    for (const id of dismissed) byId.delete(id)
    if (suppressThreadRootId) byId.delete(suppressThreadRootId)
    return Array.from(byId.values())
      .sort((x, y) => x.lastReplyAt.localeCompare(y.lastReplyAt))
      .slice(-MAX_ACTIVITIES)
  }, [seed, live, dismissed, suppressThreadRootId])

  return { activities, dismiss }
}
