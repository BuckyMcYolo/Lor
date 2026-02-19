import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"
import { Hash, PlusCircle, Send, Smile } from "lucide-react"
import { useRef, useState } from "react"

export type ChatContext =
  | { type: "channel"; name: string; topic?: string }
  | { type: "dm"; name: string; avatarUrl?: string }
  | { type: "group_dm"; name: string; memberCount: number }

interface ChatViewProps {
  context: ChatContext
}

function ChatHeader({ context }: { context: ChatContext }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      {context.type === "channel" && (
        <Hash className="size-5 shrink-0 text-muted-foreground" />
      )}
      <span className="font-semibold">{context.name}</span>
      {context.type === "channel" && context.topic && (
        <>
          <div className="mx-2 h-4 w-px bg-border" />
          <span className="truncate text-sm text-muted-foreground">
            {context.topic}
          </span>
        </>
      )}
      {context.type === "group_dm" && (
        <span className="text-sm text-muted-foreground">
          {context.memberCount} members
        </span>
      )}
    </div>
  )
}

function EmptyState({ context }: { context: ChatContext }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-end px-4 pb-4">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/10">
        <Hash className="size-8 text-foreground/60" />
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

function MessageInput({
  context,
  onSend,
}: {
  context: ChatContext
  onSend: (message: string) => void
}) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const placeholder =
    context.type === "channel"
      ? `Message #${context.name}`
      : `Send a Raven to ${context.name}`

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue("")
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 px-4 pb-6">
      <div className="flex items-end gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2">
        <button
          type="button"
          className="mb-0.5 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Attach file"
        >
          <PlusCircle className="size-5" />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            // Auto-resize
            e.target.style.height = "auto"
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          )}
        />
        <div className="mb-0.5 flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Add emoji"
          >
            <Smile className="size-5" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "size-7 text-muted-foreground transition-colors",
              value.trim() && "text-primary hover:text-primary"
            )}
            onClick={handleSend}
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ChatView({ context }: ChatViewProps) {
  // TODO: wire to actual send message API
  const handleSend = (_message: string) => {
    // no-op until messages API is wired up
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader context={context} />
      <EmptyState context={context} />
      <MessageInput context={context} onSend={handleSend} />
    </div>
  )
}
