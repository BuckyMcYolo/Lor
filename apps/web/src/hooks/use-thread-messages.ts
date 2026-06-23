import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { type MutableRefObject, useCallback, useEffect, useMemo } from "react"
import type { Message } from "@/lib/api-types"
import { realtimeMessageToMessage } from "@/lib/realtime-adapter"
import type { AppSocket } from "@/lib/socket"

export type ThreadPageParam = { before: string } | { after: string } | null

export type ThreadPage = {
  data: Message[]
  beforeCursor: string | null
  afterCursor: string | null
  reachedOldest: boolean
  reachedNewest: boolean
  // The thread root message, returned on every page so the panel can render it
  // even when it's scrolled out of the channel feed.
  root?: Message | null
}

type FetchPageParams = {
  before?: string
  after?: string
  limit: number
}

interface UseThreadMessagesOptions {
  channelId: string
  threadRootId: string
  fetchPage: (params: FetchPageParams) => Promise<ThreadPage>
  enabled?: boolean
  socket: AppSocket | null
  pendingNoncesRef?: MutableRefObject<Set<string>>
  perPage?: number
}

/**
 * Fetches + subscribes to a single thread's replies for the right-side panel.
 * Mirrors useChannelMessages but stripped down: no anchored mode, no pending
 * buffer — threads always show their full live tail.
 */
export function useThreadMessages({
  channelId,
  threadRootId,
  fetchPage,
  enabled = true,
  socket,
  pendingNoncesRef,
  perPage = 50,
}: UseThreadMessagesOptions) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<
    ThreadPage,
    Error,
    InfiniteData<ThreadPage, ThreadPageParam>,
    ["thread", string],
    ThreadPageParam
  >({
    queryKey: ["thread", threadRootId],
    queryFn: async ({ pageParam }) => {
      const params: FetchPageParams = { limit: perPage }
      if (pageParam) {
        if ("before" in pageParam) params.before = pageParam.before
        else if ("after" in pageParam) params.after = pageParam.after
      }
      return fetchPage(params)
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.reachedOldest || !lastPage.beforeCursor
        ? undefined
        : { before: lastPage.beforeCursor },
    enabled,
  })

  // Join/leave the thread room for live replies.
  useEffect(() => {
    if (!socket || !enabled) return
    socket.emit("thread:join", { threadRootId })
    return () => {
      socket.emit("thread:leave", { threadRootId })
    }
  }, [socket, threadRootId, enabled])

  // Subscribe to live replies in this thread.
  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      message: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (message.channelId !== channelId) return
      if (message.threadRootId !== threadRootId) return
      if (message.nonce && pendingNoncesRef?.current.has(message.nonce)) return

      const adapted = realtimeMessageToMessage(message)
      queryClient.setQueryData<InfiniteData<ThreadPage, ThreadPageParam>>(
        ["thread", threadRootId],
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
    }

    socket.on("message:created", handleMessageCreated)
    return () => {
      socket.off("message:created", handleMessageCreated)
    }
  }, [socket, channelId, threadRootId, queryClient, pendingNoncesRef])

  // Dedupe by id to guard against the same reply landing in two pages (e.g. a
  // page refetch racing a live insert), mirroring the channel feed.
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

  // pages[0] is the initial (newest) page; older pages append after it.
  const root = query.data?.pages[0]?.root ?? null

  const fetchOlder = useCallback(() => query.fetchNextPage(), [query])

  return {
    messages,
    root,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    fetchOlder,
    hasOlder: query.hasNextPage,
    isFetchingOlder: query.isFetchingNextPage,
  }
}
