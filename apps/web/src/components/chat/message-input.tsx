import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"
import { PlusCircle, Send, Smile } from "lucide-react"
import { useRef, useState } from "react"
import type { ChatContext } from "./header"

interface MessageInputProps {
  context: ChatContext
  onSend: (content: string) => void
  isSending?: boolean
}

export function MessageInput({
  context,
  onSend,
  isSending,
}: MessageInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const placeholder =
    context.type === "channel"
      ? `Message #${context.name}`
      : `Send a Raven to ${context.name}`

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isSending) return
    onSend(trimmed)
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.focus()
    }
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
            disabled={!value.trim() || isSending}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
