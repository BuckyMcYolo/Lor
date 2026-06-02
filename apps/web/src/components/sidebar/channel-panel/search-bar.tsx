import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { formatTime } from "@repo/utils/date"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Loader2, Search, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { MessageMarkdown } from "@/components/chat/message-markdown"
import { apiClient } from "@/lib/api-client"

type SearchResult = {
  id: string
  content: string
  createdAt: string
  channelId: string
  channelName: string
  author: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  }
}

type SearchResponse = {
  itemsTotal: number
  data: SearchResult[]
}

export function SearchBar({
  mode = "workspace",
  trailing,
}: {
  mode?: "workspace" | "dm"
  trailing?: React.ReactNode
}) {
  const { workspaceSlug } = useParams({ strict: false })
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    if (!value.trim()) {
      setDebouncedQuery("")
      return
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(value.trim())
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const { data, isPending } = useQuery({
    queryKey: [
      mode === "workspace" ? "workspace-search" : "dm-search",
      workspaceSlug,
      debouncedQuery,
    ],
    queryFn: async (): Promise<SearchResponse> => {
      if (mode === "dm") {
        const res = await apiClient.v1.dms.search.$get({
          query: { query: debouncedQuery },
        })
        if (!res.ok) throw new Error("Search failed")
        return res.json()
      }
      const res = await apiClient.v1.workspaces[":workspaceSlug"].search.$get({
        param: { workspaceSlug: workspaceSlug as string },
        query: { query: debouncedQuery },
      })
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
    enabled: debouncedQuery.length > 0 && (mode === "dm" || !!workspaceSlug),
  })

  const handleResultClick = (channelId: string, messageId: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setIsOpen(false)
    setQuery("")
    setDebouncedQuery("")
    if (mode === "dm") {
      void navigate({
        to: "/dms/$dmId",
        params: { dmId: channelId },
        search: { msgId: messageId },
      })
    } else {
      void navigate({
        to: "/$workspaceSlug/$channelId",
        params: { workspaceSlug: workspaceSlug as string, channelId },
        search: { msgId: messageId },
      })
    }
  }

  const handleClear = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setQuery("")
    setDebouncedQuery("")
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative shrink-0 pt-3 pb-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[13px]">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              mode === "dm" ? "Search all DMs" : "Search all channels"
            }
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {trailing}
      </div>

      {isOpen && debouncedQuery.length > 0 && (
        <div className="absolute right-3 left-3 z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {isPending && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {data && data.data.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No results found
            </div>
          )}
          {data?.data.map((msg) => (
            <button
              key={msg.id}
              type="button"
              className="w-full border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-accent last:border-b-0"
              onClick={() => handleResultClick(msg.channelId, msg.id)}
            >
              <div className="flex items-center gap-1.5">
                <Avatar size="sm">
                  {msg.author.image && (
                    <AvatarImage src={msg.author.image} alt={msg.author.name} />
                  )}
                  <AvatarFallback className="text-[8px] font-semibold">
                    {(msg.author.displayUsername ?? msg.author.name ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-semibold">
                  {msg.author.displayUsername ?? msg.author.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  in {mode === "workspace" ? "#" : ""}
                  {msg.channelName}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                <MessageMarkdown content={msg.content} mentions={[]} />
              </div>
            </button>
          ))}
          {data && data.itemsTotal > data.data.length && (
            <div className="py-2 text-center text-[10px] text-muted-foreground">
              {data.itemsTotal} results found — showing first {data.data.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
