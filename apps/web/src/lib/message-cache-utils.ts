import type { InfiniteData } from "@tanstack/react-query"

interface PageWithMessages<T> {
  data: T[]
}

/**
 * Applies an updater function to messages across all pages in an infinite query.
 * Used by hooks that modify the messages cache (delete, edit, react, pin).
 */
export function updateMessagesAcrossPages<
  TPage extends PageWithMessages<TPage["data"][number]>,
>(
  infiniteData: InfiniteData<TPage>,
  updater: (messages: TPage["data"]) => TPage["data"]
): InfiniteData<TPage> {
  return {
    ...infiniteData,
    pages: infiniteData.pages.map((page) => ({
      ...page,
      data: updater(page.data),
    })),
  }
}
