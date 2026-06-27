import { cn } from "@repo/ui/lib/utils"
import {
  BookOpen,
  ChevronRight,
  Download,
  ExternalLink,
  Github,
  type LucideIcon,
  PencilLine,
  Search,
  Wrench,
} from "lucide-react"
import { useState } from "react"
import type { MerlinToolCallView } from "@/lib/api-types"

// Codex/Cursor-style tool trail: a collapsible summary of the tools Merlin used
// to answer, each row drillable into its result. Expanded live while streaming
// (so progress shows), collapsed once settled; persisted, so it survives reload.

function toolIcon(toolName: string): LucideIcon {
  switch (toolName) {
    case "search_sources":
    case "search_messages":
      return Search
    case "fetch_source":
      return Download
    case "ls":
    case "tree":
    case "read":
      return BookOpen
    case "write":
    case "mkdir":
    case "move":
    case "link":
      return PencilLine
    default:
      return Wrench
  }
}

// Provider logo for a result item, inferred from its url (extends naturally as
// Linear/Datadog connectors land). Falls back to a generic external-link glyph.
function itemIcon(url?: string): LucideIcon {
  if (url && /(^|\.)github\.com\b/i.test(url)) return Github
  return ExternalLink
}

function hasDetail(t: MerlinToolCallView): boolean {
  return Boolean(t.detail?.summary || (t.detail?.items?.length ?? 0) > 0)
}

export function MerlinToolTrail({
  toolCalls,
  streaming,
}: {
  toolCalls: MerlinToolCallView[]
  streaming?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({})
  if (toolCalls.length === 0) return null

  // Force open while streaming so live progress is visible; collapse to a summary
  // once the answer settles (the user can re-open).
  const expanded = open || Boolean(streaming)
  const summary = streaming
    ? (toolCalls[toolCalls.length - 1]?.label ?? "Working…")
    : `Used ${toolCalls.length} tool${toolCalls.length === 1 ? "" : "s"}`

  return (
    <div className="mt-1 text-[11px] text-muted-foreground">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded px-0.5 hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            expanded && "rotate-90",
            streaming && "animate-pulse"
          )}
        />
        <span className="truncate">{summary}</span>
      </button>

      {expanded && (
        <div className="mt-0.5 flex flex-col gap-0.5 border-muted-foreground/15 border-l pl-2">
          {toolCalls.map((t) => {
            const Icon = toolIcon(t.toolName)
            const drillable = hasDetail(t)
            const rowOpen = openRows[t.toolCallId] ?? false
            return (
              <div key={t.toolCallId}>
                <button
                  type="button"
                  disabled={!drillable}
                  aria-expanded={drillable ? rowOpen : undefined}
                  onClick={() =>
                    setOpenRows((m) => ({ ...m, [t.toolCallId]: !rowOpen }))
                  }
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded px-0.5 text-left",
                    drillable && "cursor-pointer hover:text-foreground"
                  )}
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {t.status === "error" && (
                    <span className="shrink-0 text-destructive">failed</span>
                  )}
                  {drillable && (
                    <ChevronRight
                      className={cn(
                        "ml-auto size-3 shrink-0 transition-transform",
                        rowOpen && "rotate-90"
                      )}
                    />
                  )}
                </button>
                {drillable && rowOpen && (
                  <div className="mt-0.5 mb-1 ml-[18px] flex flex-col gap-0.5">
                    {t.detail?.summary && (
                      <span className="text-muted-foreground/80">
                        {t.detail.summary}
                      </span>
                    )}
                    {t.detail?.items?.map((it) => {
                      const ItemIcon = itemIcon(it.url)
                      const key = `${t.toolCallId}:${it.url ?? it.title}`
                      return it.url ? (
                        <a
                          key={key}
                          href={it.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                        >
                          <ItemIcon className="size-3 shrink-0" />
                          <span className="truncate">{it.title}</span>
                        </a>
                      ) : (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1"
                        >
                          <ItemIcon className="size-3 shrink-0" />
                          <span className="truncate">{it.title}</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
