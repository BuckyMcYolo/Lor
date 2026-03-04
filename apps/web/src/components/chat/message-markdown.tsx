import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Button } from "@repo/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components/hover-card"
import { cn } from "@repo/ui/lib/utils"
import { useMemo } from "react"
import ReactMarkdown, { defaultUrlTransform } from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Message } from "@/lib/api-types"

const USER_MENTION_TOKEN_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi
const TIPTAP_MENTION_REGEX =
  /\[@[^\]]*?\bid="([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"[^\]]*]/gi

function escapeMarkdownText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/]/g, "\\]")
}

function getMentionLabel(mention: Message["mentions"][number]) {
  return mention.displayUsername ?? mention.username ?? mention.name
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

function toRenderableMarkdown(
  content: string,
  mentions: Message["mentions"]
): string {
  const mentionById = new Map(mentions.map((mention) => [mention.id, mention]))

  const normalizedContent = content.replace(
    TIPTAP_MENTION_REGEX,
    (_match, userId: string) => `<@${userId}>`
  )

  return normalizedContent.replace(
    USER_MENTION_TOKEN_REGEX,
    (_match, userId: string) => {
      const mention = mentionById.get(userId)
      const label = mention ? getMentionLabel(mention) : "unknown-user"
      return `[@${escapeMarkdownText(label)}](mention:${userId})`
    }
  )
}

interface MessageMarkdownProps {
  content: string | null
  mentions: Message["mentions"]
  className?: string
}

export function MessageMarkdown({
  content,
  mentions,
  className,
}: MessageMarkdownProps) {
  const mentionById = useMemo(
    () => new Map(mentions.map((mention) => [mention.id, mention])),
    [mentions]
  )

  const markdown = useMemo(
    () => toRenderableMarkdown(content ?? "", mentions),
    [content, mentions]
  )

  if (markdown.trim().length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "break-words text-sm leading-snug text-foreground/90",
        "[&_p]:my-0 [&_a]:break-words [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:mt-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          if (url.startsWith("mention:")) {
            return url
          }

          return defaultUrlTransform(url)
        }}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("mention:")) {
              const mentionId = href.slice("mention:".length)
              const mention = mentionById.get(mentionId)
              const displayName = mention
                ? getMentionLabel(mention)
                : "Unknown user"
              const username = mention?.username

              return (
                <HoverCard openDelay={500} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    <span className="inline-flex cursor-pointer rounded bg-primary/15 px-1 py-0.5 font-medium text-primary">
                      {children}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="top"
                    align="start"
                    className="w-72 p-3"
                  >
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
                          {username ? `@${username}` : mentionId}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full"
                          disabled
                        >
                          Send Friend Request
                        </Button>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline-offset-2 hover:underline"
              >
                {children}
              </a>
            )
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
