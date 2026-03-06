import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { cn } from "@repo/ui/lib/utils"
import { formatTime } from "@repo/utils/date"
import { useCallback, useState } from "react"
import type { Message } from "@/lib/api-types"
import { EmbedCard } from "./embed-card"
import { MessageActionBar } from "./message-action-bar"
import { MessageMarkdown } from "./message-markdown"

interface MessageItemProps {
  message: Message
  showHeader: boolean
  currentUserId?: string
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

function scrollToMessage(messageId: string) {
  const el = document.querySelector(
    `[data-message-id="${messageId}"]`
  ) as HTMLElement | null
  if (!el) return

  const scrollContainer = el.closest(
    "[data-message-scroll]"
  ) as HTMLElement | null
  if (!scrollContainer) return

  const containerRect = scrollContainer.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const offset =
    elRect.top -
    containerRect.top -
    containerRect.height / 2 +
    elRect.height / 2

  scrollContainer.scrollBy({ top: offset, behavior: "smooth" })

  el.style.transition = "background-color 0.3s ease"
  el.style.backgroundColor =
    "color-mix(in oklch, var(--primary) 15%, transparent)"
  setTimeout(() => {
    el.style.transition = "background-color 1s ease-out"
    el.style.backgroundColor = ""
  }, 700)
  setTimeout(() => {
    el.style.transition = ""
  }, 2000)
}

function ReplyPreview({
  referencedMessage,
}: {
  referencedMessage: Message["referencedMessage"]
}) {
  if (!referencedMessage) {
    return (
      <div className="mb-0.5 flex items-center gap-2 pl-6 text-xs text-muted-foreground italic">
        <div className="mb-1 ml-4 h-3 w-8 rounded-tl-md border-t-2 border-l-2 border-muted-foreground/40" />
        <span>Original message was deleted</span>
      </div>
    )
  }

  const author = referencedMessage.author
  const truncatedContent =
    referencedMessage.content && referencedMessage.content.length > 100
      ? `${referencedMessage.content.slice(0, 100)}...`
      : referencedMessage.content

  return (
    <button
      type="button"
      onClick={() => scrollToMessage(referencedMessage.id)}
      className="mb-0.5 flex cursor-pointer items-center gap-1.5 rounded-sm text-xs hover:opacity-80"
    >
      <div className="mb-1 ml-4 h-3 w-8 rounded-tl-md border-t-2 border-l-2 border-muted-foreground/40" />
      <Avatar size="sm" className="size-4">
        {author.image && <AvatarImage src={author.image} alt={author.name} />}
        <AvatarFallback className="text-[8px] font-semibold">
          {nameInitial(author.displayUsername ?? author.name)}
        </AvatarFallback>
      </Avatar>
      <span className="font-semibold text-foreground/80">
        {author.displayUsername ?? author.name}
      </span>
      {truncatedContent && (
        <span className="truncate text-muted-foreground">
          {truncatedContent}
        </span>
      )}
    </button>
  )
}

export function MessageItem({
  message,
  showHeader,
  currentUserId,
  onReact,
  onReply,
}: MessageItemProps) {
  const author = message.author
  const [isActionBarPinned, setIsActionBarPinned] = useState(false)
  const isOwnMessage = !!currentUserId && currentUserId === message.authorId
  const isReply =
    message.type === "reply" && message.referencedMessageId !== null

  const handleCopyText = useCallback(() => {
    if (!message.content) return

    void navigator.clipboard.writeText(message.content).catch(() => {})
  }, [message.content])

  const handleReact = useCallback(
    (emoji: string) => {
      if (!currentUserId) return
      if (!onReact) return

      onReact(message.id, emoji)
    },
    [currentUserId, message.id, onReact]
  )

  const handleReply = useCallback(() => {
    onReply?.(message)
  }, [message, onReply])

  return (
    <div
      data-message-id={message.id}
      className="group relative px-4 py-0.5 hover:bg-muted/40"
    >
      <div
        className={cn(
          "absolute top-0 right-4 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-100",
          "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100",
          isActionBarPinned && "pointer-events-auto opacity-100"
        )}
      >
        <MessageActionBar
          onReact={handleReact}
          onReply={handleReply}
          onCopyText={handleCopyText}
          canManageMessage={isOwnMessage}
          onOverlayOpenChange={setIsActionBarPinned}
        />
      </div>
      {isReply && showHeader && (
        <ReplyPreview referencedMessage={message.referencedMessage} />
      )}
      <div className="flex gap-3">
        {showHeader ? (
          <Avatar size="lg" className="mt-0.5">
            {author.image && (
              <AvatarImage src={author.image} alt={author.name} />
            )}
            <AvatarFallback className="text-xs font-semibold">
              {nameInitial(author.displayUsername ?? author.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 shrink-0 text-right text-[10px] leading-6 text-muted-foreground opacity-0 transition-opacity duration-100 group-hover:opacity-100">
            <span className="whitespace-nowrap">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {showHeader && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold leading-snug">
                {author.displayUsername ?? author.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}
          <MessageMarkdown
            content={message.content}
            mentions={message.mentions}
          />
          {message.embeds.length > 0 && (
            <div className="flex flex-col gap-1">
              {message.embeds.map((embed, index) => (
                <EmbedCard key={`${embed.url}-${index}`} embed={embed} />
              ))}
            </div>
          )}
          {message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => handleReact(reaction.emoji)}
                  aria-pressed={reaction.reactedByCurrentUser}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    reaction.reactedByCurrentUser
                      ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
                      : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
