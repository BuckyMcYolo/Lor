import { SmilePlusIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react"
import { Plus } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "👀"]

interface EmojiReactionPickerProps {
  onSelect?: (emoji: string) => void
  onOpenChange?: (open: boolean) => void
}

export function EmojiReactionPicker({
  onSelect,
  onOpenChange,
}: EmojiReactionPickerProps) {
  const [open, setOpen] = useState(false)
  const [showFullPicker, setShowFullPicker] = useState(false)
  const { resolvedTheme } = useTheme()

  const handleSelect = (emoji: string) => {
    onSelect?.(emoji)
    setOpen(false)
    setShowFullPicker(false)
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    handleSelect(emojiData.emoji)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        onOpenChange?.(nextOpen)
        if (!nextOpen) {
          setShowFullPicker(false)
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Add reaction"
            >
              <HugeiconsIcon icon={SmilePlusIcon} size={16} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent side="top">Add reaction</TooltipContent>}
      </Tooltip>

      <PopoverContent
        side="top"
        align="center"
        className={showFullPicker ? "w-auto border-none p-0" : "w-auto p-1.5"}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {showFullPicker ? (
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
            width={340}
            height={390}
            searchPlaceholder="Search emoji..."
            skinTonesDisabled
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
          />
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
              onClick={() => setShowFullPicker(true)}
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
