import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { formatTime } from "@repo/utils/date"
import type { Message } from "@/lib/api-types"

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

  return (
    <div className="group flex gap-3 px-4 py-0.5 hover:bg-muted/40">
      {showHeader ? (
        <Avatar size="lg" className="mt-0.5">
          {author.image && <AvatarImage src={author.image} alt={author.name} />}
          <AvatarFallback className="text-xs font-semibold">
            {nameInitial(author.displayUsername ?? author.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-10 shrink-0" />
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
        <p className="break-words text-sm leading-snug text-foreground/90">
          {message.content}
        </p>
      </div>
    </div>
  )
}
