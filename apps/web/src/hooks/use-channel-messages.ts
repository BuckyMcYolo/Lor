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

// Mutually-exclusive cursor params passed to the API as `?around=`, `?before=`,
// or `?after=`. A null pageParam means "latest" — no cursor.
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
  /**
   * Optional anchor message id from the URL. When set, the initial fetch uses
   * `?around=<anchor>` and the user enters "anchored mode" — they're looking
   * at older context, not the live tail. Clearing this (e.g. via Jump-to-
   * present) drops the cache and refetches the latest page.
   */
  anchor: string | null | undefined
  fetchPage: (params: FetchPageParams) => Promise<MessagesPage>
  enabled?: boolean
  socket: AppSocket | null
  /**
   * Set of nonces created by the local client for optimistic sends. Messages
   * carrying one of these are reconciled by `useMessageSending`, so this hook
   * skips them to avoid double-handling.
   */
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

  // When the anchor changes, drop the cache so the next fetch picks up the
  // new `initialPageParam`.
  const prevAnchorRef = useRef(normalizedAnchor)
  useEffect(() => {
    if (prevAnchorRef.current !== normalizedAnchor) {
      prevAnchorRef.current = normalizedAnchor
      void queryClient.resetQueries({
        queryKey: ["messages", channelId],
      })
    }
  }, [normalizedAnchor, channelId, queryClient])

  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  )

  // "At present" = the newest page in the cache has reached the live tail.
  // Until the user scrolls back to present (or jumps), live messages from
  // others are buffered instead of being injected into the visible list.
  const isAtPresent = query.data?.pages[0]?.reachedNewest === true
  const isAtPresentRef = useRef(isAtPresent)
  useEffect(() => {
    isAtPresentRef.current = isAtPresent
  }, [isAtPresent])

  const [pendingMessages, setPendingMessages] = useState<Message[]>([])

  // When we transition into present, the buffered "N new" counter is no
  // longer meaningful — the cache itself now reflects the live tail.
  const wasAtPresentRef = useRef(isAtPresent)
  useEffect(() => {
    if (isAtPresent && !wasAtPresentRef.current) {
      setPendingMessages([])
    }
    wasAtPresentRef.current = isAtPresent
  }, [isAtPresent])

  // Listen to live `message:created` events. Nonces created by the local
  // sender are reconciled elsewhere (useMessageSending) so we skip them.
  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      message: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (message.channelId !== channelId) return
      if (message.nonce && pendingNoncesRef?.current.has(message.nonce)) return

      const adapted = realtimeMessageToMessage(message)

      if (isAtPresentRef.current) {
        // Dedup against cache, then prepend to the first (newest) page.
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

  // Drop the anchor from the URL — but the route owns navigation, so we just
  // clear local pending state and let the route do the URL bit. The reset
  // effect above will refetch the latest once `anchor` flips to null.
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
