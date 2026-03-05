import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { formatTime } from "@repo/utils/date"
import { useCallback } from "react"
import type { Message } from "@/lib/api-types"
import { MessageActionBar } from "./message-action-bar"
import { MessageMarkdown } from "./message-markdown"

interface MessageItemProps {
  message: Message
  showHeader: boolean
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const author = message.author
  const handleCopyText = useCallback(() => {
    if (!message.content) return

    void navigator.clipboard.writeText(message.content).catch(() => {})
  }, [message.content])

  return (
    <div className="group relative flex gap-3 px-4 py-0.5 hover:bg-muted/40">
      <div className="pointer-events-none absolute top-0 right-4 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <MessageActionBar onCopyText={handleCopyText} />
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
      </div>
    </div>
  )
}
