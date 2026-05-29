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

export function HeaderSearch({
  mode,
  channelId,
}: {
  mode: "workspace" | "dm"
  channelId: string
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
    queryKey: ["header-search", channelId, debouncedQuery],
    queryFn: async (): Promise<SearchResponse> => {
      if (mode === "dm") {
        const res = await apiClient.v1.dms.search.$get({
          query: { query: debouncedQuery, dmId: channelId },
        })
        if (!res.ok) throw new Error("Search failed")
        return res.json()
      }
      const res = await apiClient.v1.workspaces[":workspaceSlug"].search.$get({
        param: { workspaceSlug: workspaceSlug as string },
        query: { query: debouncedQuery, channelId },
      })
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
    enabled: debouncedQuery.length > 0,
  })

  const handleResultClick = (msgId: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setIsOpen(false)
    setQuery("")
    setDebouncedQuery("")
    // Same channel — just scroll to message via search param
    if (mode === "dm") {
      void navigate({
        to: "/dms/$dmId",
        params: { dmId: channelId },
        search: { msgId },
      })
    } else {
      void navigate({
        to: "/$workspaceSlug/$channelId",
        params: { workspaceSlug: workspaceSlug as string, channelId },
        search: { msgId },
      })
    }
  }

  const handleClose = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setQuery("")
    setDebouncedQuery("")
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Search className="size-4" />
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex h-7 w-56 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs">
        <Search className="size-3 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder={
            mode === "dm"
              ? "Search this conversation..."
              : "Search this channel..."
          }
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && handleClose()}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>

      {debouncedQuery.length > 0 && (
        <div className="absolute right-0 z-50 mt-1 max-h-72 w-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
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
              className="w-full border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-accent last:border-b-0"
              onClick={() => handleResultClick(msg.id)}
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
            <div className="py-1.5 text-center text-[10px] text-muted-foreground">
              {data.itemsTotal} results — showing first {data.data.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
