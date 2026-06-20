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

// Shared Shiki highlighter instance; loads languages lazily as code streams in.
const codePlugin = createCodePlugin({
  themes: ["github-light", "github-dark-dimmed"],
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
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
}

interface MentionProps {
  "data-id"?: string
  children?: ReactNode
  node?: { properties?: Record<string, unknown> }
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
}

export function MessageMarkdown({
  content,
  mentions,
  className,
  editedAt,
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
          className="text-primary underline-offset-2 hover:underline"
        >
          {children}
        </a>
      ),
      // biome-ignore lint/suspicious/noExplicitAny: streamdown types custom tags loosely
      mention: (props: any) => {
        const id = mentionId(props)
        const children = props.children as ReactNode
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
    [mentionById]
  )

  if (markdown.trim().length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "break-words text-sm leading-snug text-foreground/90",
        "[&_p]:my-0 [&_a]:break-words [&_:not(pre)>code]:rounded-[4px] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border/70 [&_:not(pre)>code]:bg-primary/10 [&_:not(pre)>code]:px-0.75 [&_:not(pre)>code]:py-0.25 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.92em] [&_:not(pre)>code]:text-foreground [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        editedAt && "[&>p:last-of-type]:inline",
        className
      )}
    >
      <Streamdown
        plugins={{ code: codePlugin }}
        allowedTags={{ mention: ["data-id"] }}
        literalTagContent={["mention"]}
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
