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
import { MessageSquarePlus, MoreHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { EmojiReactionPicker } from "./emoji-reaction-picker"

interface MessageActionBarProps {
  onReact?: (emoji: string) => void
  onReply?: () => void
  onCopyText?: () => void
  onEdit?: () => void
  onDelete?: () => void
  canManageMessage?: boolean
  onOverlayOpenChange?: (open: boolean) => void
}

export function MessageActionBar({
  onReact,
  onReply,
  onCopyText,
  onEdit,
  onDelete,
  canManageMessage = false,
  onOverlayOpenChange,
}: MessageActionBarProps) {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  useEffect(() => {
    onOverlayOpenChange?.(isEmojiOpen || isMoreOpen)
  }, [isEmojiOpen, isMoreOpen, onOverlayOpenChange])

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
            <MessageSquarePlus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Reply</TooltipContent>
      </Tooltip>

      <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <Tooltip>
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
            <>
              <DropdownMenuItem onSelect={onEdit} disabled={!onEdit}>
                Edit message
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} disabled={!onDelete}>
                Delete message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={onCopyText}>Copy text</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
