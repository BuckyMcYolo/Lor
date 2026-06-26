import {
  MessageMultiple01Icon,
  Pin02Icon,
  PinOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@repo/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { MoreHorizontal, Reply } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { EmojiReactionPicker } from "@/components/chat/emoji-reaction-picker"

interface MessageActionBarProps {
  onReact?: (emoji: string) => void
  onReply?: () => void
  onReplyInThread?: () => void
  onCopyText?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onTogglePin?: () => void
  isPinned?: boolean
  canManageMessage?: boolean
  canPin?: boolean
  onOverlayOpenChange?: (open: boolean) => void
}

export function MessageActionBar({
  onReact,
  onReply,
  onReplyInThread,
  onCopyText,
  onEdit,
  onDelete,
  onTogglePin,
  isPinned = false,
  canManageMessage = false,
  canPin = false,
  onOverlayOpenChange,
}: MessageActionBarProps) {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [suppressTooltip, setSuppressTooltip] = useState(false)
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    onOverlayOpenChange?.(isEmojiOpen || isMoreOpen)
  }, [isEmojiOpen, isMoreOpen, onOverlayOpenChange])

  useEffect(() => {
    return () => {
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current)
    }
  }, [])

  const handleMoreOpenChange = useCallback((open: boolean) => {
    setIsMoreOpen(open)
    if (!open) {
      // Suppress tooltip briefly after dropdown closes to prevent it from sticking
      setSuppressTooltip(true)
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current)
      suppressTimeoutRef.current = setTimeout(
        () => setSuppressTooltip(false),
        150
      )
    }
  }, [])

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-sm">
      <EmojiReactionPicker onSelect={onReact} onOpenChange={setIsEmojiOpen} />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7"
            onClick={onReply}
            aria-label="Reply"
          >
            <Reply className="size-4" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Reply</TooltipContent>
      </Tooltip>

      {onReplyInThread && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onReplyInThread}
              aria-label="Reply in thread"
            >
              <HugeiconsIcon icon={MessageMultiple01Icon} size={8} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Reply in thread</TooltipContent>
        </Tooltip>
      )}

      <DropdownMenu open={isMoreOpen} onOpenChange={handleMoreOpenChange}>
        <Tooltip open={isMoreOpen || suppressTooltip ? false : undefined}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-7"
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">More actions</TooltipContent>
        </Tooltip>

        <DropdownMenuContent side="top" align="end">
          {canManageMessage && (
            <DropdownMenuItem onSelect={onEdit} disabled={!onEdit}>
              Edit message
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onCopyText}>Copy text</DropdownMenuItem>
          {canPin && (
            <DropdownMenuItem onSelect={onTogglePin} disabled={!onTogglePin}>
              <HugeiconsIcon
                icon={isPinned ? PinOffIcon : Pin02Icon}
                size={14}
              />
              {isPinned ? "Unpin message" : "Pin message"}
            </DropdownMenuItem>
          )}
          {canManageMessage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onDelete}
                disabled={!onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete message
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
