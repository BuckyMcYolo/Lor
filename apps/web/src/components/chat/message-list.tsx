import { Hash, User, Users } from "lucide-react"
import type { Message } from "@/lib/api-types"
import type { ChatContext } from "./header"
import { MessageItem } from "./message-item"

interface MessageListProps {
  context: ChatContext
  messages: Message[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

function EmptyState({ context }: { context: ChatContext }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-end px-4 pb-4">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/10">
        {context.type === "channel" && (
          <Hash className="size-8 text-foreground/60" />
        )}
        {context.type === "dm" && (
          <User className="size-8 text-foreground/60" />
        )}
        {context.type === "group_dm" && (
          <Users className="size-8 text-foreground/60" />
        )}
      </div>
      <h2 className="text-xl font-bold">
        {context.type === "channel"
          ? `Welcome to #${context.name}!`
          : `This is the beginning of your conversation with ${context.name}`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {context.type === "channel"
          ? "This is the start of the channel."
          : "Send a message to get the conversation going."}
      </p>
    </div>
  )
}

export function MessageList({
  context,
  messages,
  isLoading,
  hasMore,
  onLoadMore,
}: MessageListProps) {
  if (isLoading) {
    return (
      <output
        className="flex flex-1 items-center justify-center"
        aria-live="polite"
      >
        <span className="text-sm text-muted-foreground">
          Loading messages...
        </span>
      </output>
    )
  }

  if (messages.length === 0) {
    return <EmptyState context={context} />
  }

  return (
    <div className="flex flex-1 flex-col-reverse overflow-y-auto py-4">
      {messages.map((msg, i) => {
        const next = messages[i + 1]
        const showHeader = !next || next.authorId !== msg.authorId
        return (
          <MessageItem key={msg.id} message={msg} showHeader={showHeader} />
        )
      })}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={onLoadMore}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
