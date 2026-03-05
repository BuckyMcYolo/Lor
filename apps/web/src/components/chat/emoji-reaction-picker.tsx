import { Button } from "@repo/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { Plus, SmilePlus } from "lucide-react"
import { useState } from "react"

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "👀"]

const EXTENDED_EMOJIS = [
  "😀",
  "😄",
  "😁",
  "😆",
  "😊",
  "😉",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤓",
  "🤩",
  "😮",
  "😢",
  "😭",
  "😡",
  "🤯",
  "😱",
  "🥳",
  "👏",
  "🙌",
  "🙏",
  "💪",
  "👀",
  "🔥",
  "✨",
  "⭐",
  "💯",
  "❤️",
  "💔",
  "👍",
  "👎",
  "👌",
  "✌️",
  "👋",
  "🎉",
  "✅",
  "❌",
  "🚀",
  "💡",
]

interface EmojiReactionPickerProps {
  onSelect?: (emoji: string) => void
}

export function EmojiReactionPicker({ onSelect }: EmojiReactionPickerProps) {
  const [open, setOpen] = useState(false)
  const [showExtended, setShowExtended] = useState(false)

  const handleSelect = (emoji: string) => {
    onSelect?.(emoji)
    setOpen(false)
    setShowExtended(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setShowExtended(false)
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-7"
              aria-label="Add reaction"
            >
              <SmilePlus className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent side="top">Add reaction</TooltipContent>}
      </Tooltip>

      <PopoverContent
        side="top"
        align="center"
        className={showExtended ? "w-64 p-2" : "w-auto p-1.5"}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {showExtended ? (
          <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
            {EXTENDED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
                onClick={() => handleSelect(emoji)}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
                onClick={() => handleSelect(emoji)}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setShowExtended(true)}
              aria-label="Open full emoji picker"
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
