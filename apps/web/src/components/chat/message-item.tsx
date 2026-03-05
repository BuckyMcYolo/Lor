import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { cn } from "@repo/ui/lib/utils"
import { formatTime } from "@repo/utils/date"
import { useCallback, useState } from "react"
import type { Message } from "@/lib/api-types"
import { MessageActionBar } from "./message-action-bar"
import { MessageMarkdown } from "./message-markdown"

interface MessageItemProps {
  message: Message
  showHeader: boolean
  currentUserId?: string
  onReact?: (messageId: string, emoji: string) => void
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

export function MessageItem({
  message,
  showHeader,
  currentUserId,
  onReact,
}: MessageItemProps) {
  const author = message.author
  const [isActionBarPinned, setIsActionBarPinned] = useState(false)
  const isOwnMessage = !!currentUserId && currentUserId === message.authorId

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

  return (
    <div className="group relative flex gap-3 px-4 py-0.5 hover:bg-muted/40">
      <div
        className={cn(
          "absolute top-0 right-4 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-100",
          "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100",
          isActionBarPinned && "pointer-events-auto opacity-100"
        )}
      >
        <MessageActionBar
          onReact={handleReact}
          onCopyText={handleCopyText}
          canManageMessage={isOwnMessage}
          onOverlayOpenChange={setIsActionBarPinned}
        />
      </div>
      {showHeader ? (
        <Avatar size="lg" className="mt-0.5">
          {author.image && <AvatarImage src={author.image} alt={author.name} />}
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
  )
}
