import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components/hover-card"
import { cn } from "@repo/ui/lib/utils"
import { createCodePlugin } from "@streamdown/code"
import { type ReactNode, useMemo } from "react"
import { type Components, Streamdown } from "streamdown"
import type { Message } from "@/lib/api-types"

const USER_MENTION_TOKEN_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi
const TIPTAP_MENTION_REGEX =
  /\[@[^\]]*?\bid="([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"[^\]]*]/gi
const EVERYONE_MENTION_REGEX = /(^|\s)@everyone\b/gi
// Merlin cites grounded sources, all verified server-side: [[/path]] (brain
// page), [[msg:<id>]] (message), or [[src:<id>|<title>|<url>]] (connected-tool
// source, enriched with its verified title + url at grounding time).
const CITATION_REGEX = /\[\[([^\]]+)\]\]/g

// Shared Shiki highlighter instance; loads languages lazily as code streams in.
const codePlugin = createCodePlugin({
  themes: ["github-light", "github-dark-dimmed"],
})

// Escapes for both text and double-quoted attribute contexts (data-id below),
// so a citation token can't break out of its attribute.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getMentionLabel(mention: Message["mentions"][number]) {
  return mention.displayUsername ?? mention.username ?? mention.name
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

// Mentions are emitted as a custom <mention> tag rather than a link so they
// survive Streamdown's HTML sanitizer (which strips non-http href schemes). The
// label is kept as the tag's (literal) children so it renders even before the
// component resolves, and so the element isn't dropped as empty.
function toRenderableMarkdown(
  content: string,
  mentions: Message["mentions"]
): string {
  const mentionById = new Map(mentions.map((m) => [m.id, m]))
  return content
    .replace(TIPTAP_MENTION_REGEX, (_match, userId: string) => `<@${userId}>`)
    .replace(
      EVERYONE_MENTION_REGEX,
      (_match, prefix: string) =>
        `${prefix}<mention data-id="everyone">@everyone</mention>`
    )
    .replace(USER_MENTION_TOKEN_REGEX, (_match, userId: string) => {
      const mention = mentionById.get(userId)
      const label = mention ? getMentionLabel(mention) : "unknown-user"
      return `<mention data-id="${userId}">@${escapeHtml(label)}</mention>`
    })
    .replace(CITATION_REGEX, (_match, raw: string) => {
      const token = raw.trim()
      if (token.startsWith("msg:")) {
        const id = token.slice(4).trim()
        return `<msgref data-id="${escapeHtml(id)}">↗ message</msgref>`
      }
      if (token.startsWith("src:")) {
        // Enriched [[src:<id>|<title>|<url>]] once grounded; bare [[src:<id>]]
        // while still streaming (renders as a non-clickable chip until settled).
        const [, title = "", url = ""] = token.slice(4).split("|")
        const label = title.trim() || "source"
        const safeUrl = url.trim()
        return safeUrl
          ? `<srcref data-url="${escapeHtml(safeUrl)}">↗ ${escapeHtml(label)}</srcref>`
          : `<srcref>↗ ${escapeHtml(label)}</srcref>`
      }
      return `<pageref>${escapeHtml(token)}</pageref>`
    })
}

interface MentionProps {
  "data-id"?: string
  "data-url"?: string
  children?: ReactNode
  node?: { properties?: Record<string, unknown> }
}

function srcUrl(props: MentionProps): string | undefined {
  return (
    props["data-url"] ??
    (props.node?.properties?.dataUrl as string | undefined) ??
    (props.node?.properties?.["data-url"] as string | undefined)
  )
}

function mentionId(props: MentionProps): string | undefined {
  return (
    props["data-id"] ??
    (props.node?.properties?.dataId as string | undefined) ??
    (props.node?.properties?.["data-id"] as string | undefined)
  )
}

interface MessageMarkdownProps {
  content: string | null
  mentions: Message["mentions"]
  className?: string
  editedAt?: string | null
  // Jump to a cited message ([[msg:<id>]]); resolves cross-channel.
  onCitationJump?: (messageId: string) => void
}

export function MessageMarkdown({
  content,
  mentions,
  className,
  editedAt,
  onCitationJump,
}: MessageMarkdownProps) {
  const mentionById = useMemo(
    () => new Map(mentions.map((mention) => [mention.id, mention])),
    [mentions]
  )

  const markdown = useMemo(
    () => toRenderableMarkdown(content ?? "", mentions),
    [content, mentions]
  )

  const components = useMemo<Components>(
    () => ({
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="break-words text-primary underline-offset-2 hover:underline"
        >
          {children}
        </a>
      ),
      // Verified brain-page citation ([[/path]]). Subtle, non-clickable for now
      // (no brain browser yet); the path is the children text.
      pageref: (props: MentionProps) => (
        <span className="inline-flex items-center rounded bg-muted px-1 py-0.5 font-mono text-[0.82em] text-muted-foreground">
          {props.children}
        </span>
      ),
      // Verified connected-tool source citation ([[src:<id>]]). Links out to the
      // source's verified url (carried inline post-grounding); falls back to a
      // non-clickable chip while streaming, before the url is attached.
      srcref: (props: MentionProps) => {
        const url = srcUrl(props)
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-[0.82em] text-primary hover:bg-primary/20"
            >
              {props.children}
            </a>
          )
        }
        return (
          <span className="inline-flex items-center rounded bg-muted px-1 py-0.5 text-[0.82em] text-muted-foreground">
            {props.children}
          </span>
        )
      },
      // Verified message citation ([[msg:<id>]]). Clickable — jumps to the
      // message (resolving its channel if elsewhere in the workspace).
      msgref: (props: MentionProps) => {
        const id = mentionId(props)
        return (
          <button
            type="button"
            disabled={!(id && onCitationJump)}
            onClick={() => id && onCitationJump?.(id)}
            className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-[0.82em] text-primary hover:bg-primary/20 disabled:cursor-default disabled:opacity-70"
          >
            {props.children}
          </button>
        )
      },
      mention: (props: MentionProps) => {
        const id = mentionId(props)
        const children = props.children
        if (id === "everyone") {
          return (
            <span className="inline-flex cursor-default rounded bg-primary/15 px-1 py-0.5 font-medium text-primary">
              {children}
            </span>
          )
        }

        const mention = id ? mentionById.get(id) : undefined
        const displayName = mention ? getMentionLabel(mention) : "Unknown user"
        const username = mention?.username

        return (
          <HoverCard openDelay={500} closeDelay={80}>
            <HoverCardTrigger asChild>
              <span className="inline-flex cursor-pointer rounded bg-primary/15 px-1 py-0.5 font-medium text-primary">
                {children}
              </span>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="start" className="w-72 p-3">
              <div className="flex items-start gap-3">
                <Avatar size="lg">
                  {mention?.image && (
                    <AvatarImage src={mention.image} alt={displayName} />
                  )}
                  <AvatarFallback className="text-xs font-semibold">
                    {nameInitial(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {displayName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {username ? `@${username}` : (id ?? "")}
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      },
    }),
    [mentionById, onCitationJump]
  )

  if (markdown.trim().length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "message-markdown break-words text-sm leading-snug text-foreground/90",
        editedAt && "[&>p:last-of-type]:inline",
        className
      )}
    >
      <Streamdown
        plugins={{ code: codePlugin }}
        allowedTags={{
          mention: ["data-id"],
          pageref: [],
          msgref: ["data-id"],
          srcref: ["data-url"],
        }}
        literalTagContent={["mention", "pageref", "msgref", "srcref"]}
        components={components}
      >
        {markdown}
      </Streamdown>
      {editedAt && (
        <span className="ml-1 text-[10px] leading-snug text-muted-foreground/50">
          (edited)
        </span>
      )}
    </div>
  )
}
