import type { Message } from "@/lib/api-types"

interface MessageItemProps {
  message: Message
  showHeader: boolean
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const author = message.author

  return (
    <div className="group flex gap-3 px-4 py-0.5 hover:bg-muted/40">
      {showHeader ? (
        <img
          src={author.image ?? undefined}
          alt={author.name}
          className="mt-0.5 size-10 shrink-0 rounded-full bg-muted object-cover"
        />
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
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
