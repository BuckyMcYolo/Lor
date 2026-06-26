import type { RealtimeMessageThreadUpdated } from "@repo/realtime-types"
import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { Message } from "@/lib/api-types"
import { realtimeMessageToMessage } from "@/lib/realtime-adapter"
import type { AppSocket } from "@/lib/socket"

// Mutually exclusive; null = latest.
export type MessagesPageParam =
  | { around: string }
  | { before: string }
  | { after: string }
  | null

export type MessagesPage = {
  data: Message[]
  beforeCursor: string | null
  afterCursor: string | null
  reachedOldest: boolean
  reachedNewest: boolean
}

type FetchPageParams = {
  around?: string
  before?: string
  after?: string
  limit: number
}

interface UseChannelMessagesOptions {
  channelId: string
  /** Anchor message id; when set, initial fetch uses `?around=<id>`. */
  anchor: string | null | undefined
  fetchPage: (params: FetchPageParams) => Promise<MessagesPage>
  enabled?: boolean
  socket: AppSocket | null
  /** Own optimistic-send nonces; reconciled by useMessageSending, skipped here. */
  pendingNoncesRef?: MutableRefObject<Set<string>>
  perPage?: number
}

export function useChannelMessages({
  channelId,
  anchor,
  fetchPage,
  enabled = true,
  socket,
  pendingNoncesRef,
  perPage = 50,
}: UseChannelMessagesOptions) {
  const queryClient = useQueryClient()
  const normalizedAnchor = anchor ?? null

  const query = useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage, MessagesPageParam>,
    ["messages", string],
    MessagesPageParam
  >({
    queryKey: ["messages", channelId],
    queryFn: async ({ pageParam }) => {
      const params: FetchPageParams = { limit: perPage }
      if (pageParam) {
        if ("around" in pageParam) params.around = pageParam.around
        else if ("before" in pageParam) params.before = pageParam.before
        else if ("after" in pageParam) params.after = pageParam.after
      }
      return fetchPage(params)
    },
    initialPageParam: normalizedAnchor ? { around: normalizedAnchor } : null,
    getNextPageParam: (lastPage) =>
      lastPage.reachedOldest || !lastPage.beforeCursor
        ? undefined
        : { before: lastPage.beforeCursor },
    getPreviousPageParam: (firstPage) =>
      firstPage.reachedNewest || !firstPage.afterCursor
        ? undefined
        : { after: firstPage.afterCursor },
    enabled,
  })

  // Anchor change → drop cache so the next fetch uses the new initialPageParam.
  const prevAnchorRef = useRef(normalizedAnchor)
  useEffect(() => {
    if (prevAnchorRef.current !== normalizedAnchor) {
      prevAnchorRef.current = normalizedAnchor
      void queryClient.resetQueries({
        queryKey: ["messages", channelId],
      })
    }
  }, [normalizedAnchor, channelId, queryClient])

  // Dedupe by id: an anchored (`around`) refetch can race with in-flight
  // before/after pagination fetches and briefly leave the same message in two
  // pages. The live-insert path already guards against dupes; mirror that here.
  const messages = useMemo(() => {
    const seen = new Set<string>()
    const deduped: Message[] = []
    for (const page of query.data?.pages ?? []) {
      for (const m of page.data) {
        if (seen.has(m.id)) continue
        seen.add(m.id)
        deduped.push(m)
      }
    }
    return deduped
  }, [query.data])

  // True iff the newest cached page has reached the live tail.
  const isAtPresent = query.data?.pages[0]?.reachedNewest === true
  const isAtPresentRef = useRef(isAtPresent)
  useEffect(() => {
    isAtPresentRef.current = isAtPresent
  }, [isAtPresent])

  const [pendingMessages, setPendingMessages] = useState<Message[]>([])

  // Pending buffer is conversation-scoped.
  useEffect(() => {
    setPendingMessages([])
  }, [channelId, normalizedAnchor])

  // Drop buffered "N new" when we re-enter the live tail.
  const wasAtPresentRef = useRef(isAtPresent)
  useEffect(() => {
    if (isAtPresent && !wasAtPresentRef.current) {
      setPendingMessages([])
    }
    wasAtPresentRef.current = isAtPresent
  }, [isAtPresent])

  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      message: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (message.channelId !== channelId) return
      // Thread replies belong in the thread cache, not the channel feed.
      if (message.threadRootId) return
      if (message.nonce && pendingNoncesRef?.current.has(message.nonce)) return

      const adapted = realtimeMessageToMessage(message)

      if (isAtPresentRef.current) {
        queryClient.setQueryData<InfiniteData<MessagesPage, MessagesPageParam>>(
          ["messages", channelId],
          (old) => {
            if (!old) return old
            const exists = old.pages.some((page) =>
              page.data.some((m) => m.id === adapted.id)
            )
            if (exists) return old
            return {
              ...old,
              pages: old.pages.map((page, i) =>
                i === 0
                  ? {
                      ...page,
                      data: [adapted, ...page.data],
                      afterCursor: adapted.id,
                    }
                  : page
              ),
            }
          }
        )
      } else {
        setPendingMessages((prev) => {
          if (prev.some((m) => m.id === adapted.id)) return prev
          return [...prev, adapted]
        })
      }
    }

    socket.on("message:created", handleMessageCreated)
    return () => {
      socket.off("message:created", handleMessageCreated)
    }
  }, [socket, channelId, queryClient, pendingNoncesRef])

  // Patch the root's threadSummary in the channel cache when a thread gets
  // a reply (the reply itself is broadcast to the thread room only).
  useEffect(() => {
    if (!socket) return
    const handleThreadUpdated = (payload: RealtimeMessageThreadUpdated) => {
      if (payload.channelId !== channelId) return
      // `replyCount === 0` means the thread is empty (last reply deleted) —
      // clear the footer rather than rendering "0 replies".
      const nextSummary =
        payload.replyCount === 0 || !payload.lastReplyAt
          ? null
          : {
              replyCount: payload.replyCount,
              lastReplyAt: payload.lastReplyAt,
              participants: payload.participants,
            }
      queryClient.setQueryData<InfiniteData<MessagesPage, MessagesPageParam>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === payload.threadRootId
                  ? { ...m, threadSummary: nextSummary }
                  : m
              ),
            })),
          }
        }
      )
    }
    socket.on("message:thread:updated", handleThreadUpdated)
    return () => {
      socket.off("message:thread:updated", handleThreadUpdated)
    }
  }, [socket, channelId, queryClient])

  // Route owns navigation; we just clear local state.
  const clearPending = useCallback(() => {
    setPendingMessages([])
  }, [])

  return {
    messages,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    fetchOlder: query.fetchNextPage,
    fetchNewer: query.fetchPreviousPage,
    hasOlder: query.hasNextPage,
    hasNewer: query.hasPreviousPage,
    isFetchingOlder: query.isFetchingNextPage,
    isFetchingNewer: query.isFetchingPreviousPage,
    isAtPresent,
    pendingMessages,
    pendingCount: pendingMessages.length,
    clearPending,
  }
}
