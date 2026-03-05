import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Button } from "@repo/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components/hover-card"
import { cn } from "@repo/ui/lib/utils"
import { Check, Code2, Copy } from "lucide-react"
import {
  Children,
  isValidElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import ReactMarkdown, { defaultUrlTransform } from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import "highlight.js/styles/github-dark-dimmed.css"
import type { Message } from "@/lib/api-types"

const USER_MENTION_TOKEN_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi
const TIPTAP_MENTION_REGEX =
  /\[@[^\]]*?\bid="([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"[^\]]*]/gi
const LANGUAGE_CLASS_REGEX = /language-([a-z0-9-]+)/i

function getTextContent(node: ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (!node) return ""

  if (Array.isArray(node)) {
    return node.map((child) => getTextContent(child)).join("")
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextContent(node.props.children)
  }

  return ""
}

function parseCodeBlock(children: ReactNode) {
  const firstChild = Children.toArray(children).find((child) =>
    isValidElement<{ className?: string; children?: ReactNode }>(child)
  )

  if (
    !firstChild ||
    !isValidElement<{ className?: string; children?: ReactNode }>(firstChild)
  ) {
    return {
      code: getTextContent(children).replace(/\n$/, ""),
      language: "text",
    }
  }

  const className =
    typeof firstChild.props.className === "string"
      ? firstChild.props.className
      : ""
  const language = className.match(LANGUAGE_CLASS_REGEX)?.[1] ?? "text"
  const code = getTextContent(firstChild.props.children).replace(/\n$/, "")

  return { code, language }
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const clearCopiedTimerRef = useRef<number | null>(null)

  const { code, language } = useMemo(
    () => parseCodeBlock(children ?? null),
    [children]
  )

  useEffect(() => {
    return () => {
      if (clearCopiedTimerRef.current !== null) {
        window.clearTimeout(clearCopiedTimerRef.current)
      }
    }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)

      if (clearCopiedTimerRef.current !== null) {
        window.clearTimeout(clearCopiedTimerRef.current)
      }
      clearCopiedTimerRef.current = window.setTimeout(() => {
        setCopied(false)
      }, 1200)
    } catch {
      // No-op if clipboard access is unavailable.
    }
  }, [code])

  const languageLabel =
    language.toLowerCase() === "plaintext" ? "plain text" : language

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-border/70 bg-muted/50">
      <div className="flex items-center justify-between border-b border-border/70 bg-background/40 px-2 py-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Code2 className="size-3.5" />
          {languageLabel}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-3">{children}</pre>
    </div>
  )
}

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
        "[&_p]:my-0 [&_a]:break-words [&_code]:rounded-[4px] [&_code]:border [&_code]:border-border/70 [&_code]:bg-primary/10 [&_code]:px-0.75 [&_code]:py-0.25 [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-foreground [&_pre_code]:rounded-none [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code.hljs]:bg-transparent [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
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
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
