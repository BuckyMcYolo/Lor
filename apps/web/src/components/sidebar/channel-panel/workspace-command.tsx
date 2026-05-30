"use client"

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Kbd } from "@repo/ui/components/unlumen-ui/kbd"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Loader2, Monitor, Moon, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiClient } from "@/lib/api-client"

type SearchResult = {
  id: string
  content: string
  channelId: string
  channelName: string
  author: {
    displayUsername: string | null
    name: string
  }
}

type SearchResponse = {
  itemsTotal: number
  data: SearchResult[]
}

export function WorkspaceCommand() {
  const { workspaceSlug } = useParams({ strict: false })
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setShowContent(false)
      return
    }
    const t = setTimeout(() => setShowContent(true), 150)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (!query.trim()) {
      setDebouncedQuery("")
      return
    }
    debounceTimer.current = setTimeout(
      () => setDebouncedQuery(query.trim()),
      250
    )
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [query])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setDebouncedQuery("")
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ["workspace-search", workspaceSlug, debouncedQuery],
    queryFn: async (): Promise<SearchResponse> => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].search.$get({
        param: { workspaceSlug: workspaceSlug as string },
        query: { query: debouncedQuery },
      })
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
    enabled: open && debouncedQuery.length > 0 && !!workspaceSlug,
  })

  const goToMessage = useCallback(
    (channelId: string, messageId: string) => {
      setOpen(false)
      if (!workspaceSlug) return
      void navigate({
        to: "/$workspaceSlug/$channelId",
        params: { workspaceSlug, channelId },
        search: { msgId: messageId },
      })
    },
    [navigate, workspaceSlug]
  )

  const runTheme = useCallback(
    (value: "light" | "dark" | "system") => {
      setOpen(false)
      setTheme(value)
    },
    [setTheme]
  )

  const hasQuery = debouncedQuery.length > 0
  const results = data?.data ?? []
  const showResults = hasQuery && !isFetching && results.length > 0
  const showEmpty = hasQuery && !isFetching && results.length === 0
  const showLoader = hasQuery && isFetching

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.04]"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Search</span>
        <span className="inline-flex shrink-0 items-center gap-0.5">
          <Kbd size="sm">⌘</Kbd>
          <Kbd size="sm">K</Kbd>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search messages or run a command.
            </DialogDescription>
          </DialogHeader>
          <Command
            shouldFilter={false}
            className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[data-slot=command-input-wrapper]_svg]:h-5 [&_[data-slot=command-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search messages, run commands…"
            />
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: showContent ? "420px" : "0px",
                opacity: showContent ? 1 : 0,
              }}
            >
              <CommandList className="max-h-[420px]">
                {showLoader && (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Searching…
                  </div>
                )}

                {showEmpty && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No messages found for “{debouncedQuery}”.
                  </div>
                )}

                {showResults && (
                  <CommandGroup heading="Messages">
                    {results.map((msg) => (
                      <CommandItem
                        key={msg.id}
                        value={msg.id}
                        onSelect={() => goToMessage(msg.channelId, msg.id)}
                        className="items-start"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium text-foreground">
                              #{msg.channelName}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="truncate text-muted-foreground">
                              {msg.author.displayUsername ?? msg.author.name}
                            </span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {msg.content}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!hasQuery && (
                  <CommandGroup heading="Theme">
                    <CommandItem
                      value="theme-light"
                      keywords={["light", "bright", "day"]}
                      onSelect={() => runTheme("light")}
                    >
                      <Sun />
                      Light mode
                    </CommandItem>
                    <CommandItem
                      value="theme-dark"
                      keywords={["dark", "night"]}
                      onSelect={() => runTheme("dark")}
                    >
                      <Moon />
                      Dark mode
                    </CommandItem>
                    <CommandItem
                      value="theme-system"
                      keywords={["system", "auto"]}
                      onSelect={() => runTheme("system")}
                    >
                      <Monitor />
                      System theme
                    </CommandItem>
                  </CommandGroup>
                )}

                {showResults && (
                  <>
                    <CommandSeparator />
                    <div className="py-1.5 text-center text-[10px] text-muted-foreground">
                      {data?.itemsTotal && data.itemsTotal > results.length
                        ? `${data.itemsTotal} results — showing first ${results.length}`
                        : `${results.length} result${results.length === 1 ? "" : "s"}`}
                    </div>
                  </>
                )}
              </CommandList>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
