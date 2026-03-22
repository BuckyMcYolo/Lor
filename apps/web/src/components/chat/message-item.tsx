import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { cn } from "@repo/ui/lib/utils"
import { formatTime } from "@repo/utils/date"
import { Pin } from "lucide-react"
import { useCallback, useState } from "react"
import { UserProfilePopover } from "@/components/ui/user-profile-card"
import type { Message } from "@/lib/api-types"
import type { MentionCandidate } from "./composer/mention-types"
import { EmbedCard } from "./embed-card"
import { MessageActionBar } from "./message-action-bar"
import { AttachmentGrid } from "./message-attachment"
import { MessageEditInput } from "./message-edit-input"
import { MessageMarkdown } from "./message-markdown"

interface MessageItemProps {
  message: Message
  showHeader: boolean
  currentUserId?: string
  isBlocked?: boolean
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void
  canPin?: boolean
  mentionCandidates?: MentionCandidate[]
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

function scrollToMessage(messageId: string) {
  const el = document.querySelector(
    `[data-message-id="${messageId}"]`
  ) as HTMLElement | null
  if (!el) return

  const scrollContainer = el.closest(
    "[data-message-scroll]"
  ) as HTMLElement | null
  if (!scrollContainer) return

  const containerRect = scrollContainer.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const offset =
    elRect.top -
    containerRect.top -
    containerRect.height / 2 +
    elRect.height / 2

  scrollContainer.scrollBy({ top: offset, behavior: "smooth" })

  el.style.transition = "background-color 0.3s ease"
  el.style.backgroundColor =
    "color-mix(in oklch, var(--primary) 15%, transparent)"
  setTimeout(() => {
    el.style.transition = "background-color 1s ease-out"
    el.style.backgroundColor = ""
  }, 700)
  setTimeout(() => {
    el.style.transition = ""
  }, 2000)
}

function ReplyPreview({
  referencedMessage,
}: {
  referencedMessage: Message["referencedMessage"]
}) {
  if (!referencedMessage) {
    return (
      <div className="mb-0.5 flex items-center gap-2 pl-6 text-xs text-muted-foreground italic">
        <div className="mb-1 ml-4 h-3 w-8 rounded-tl-md border-t-2 border-l-2 border-muted-foreground/40" />
        <span>Original message was deleted</span>
      </div>
    )
  }

  const author = referencedMessage.author
  const truncatedContent =
    referencedMessage.content && referencedMessage.content.length > 100
      ? `${referencedMessage.content.slice(0, 100)}...`
      : referencedMessage.content

  return (
    <button
      type="button"
      onClick={() => scrollToMessage(referencedMessage.id)}
      className="mb-0.5 flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-sm text-xs hover:opacity-80"
    >
      <div className="mb-1 ml-4 h-3 w-8 rounded-tl-md border-t-2 border-l-2 border-muted-foreground/40" />
      <Avatar size="sm" className="size-4">
        {author.image && <AvatarImage src={author.image} alt={author.name} />}
        <AvatarFallback className="text-[8px] font-semibold">
          {nameInitial(author.displayUsername ?? author.name)}
        </AvatarFallback>
      </Avatar>
      <span className="shrink-0 font-semibold text-foreground/80">
        {author.displayUsername ?? author.name}
      </span>
      {truncatedContent && (
        <span className="truncate text-muted-foreground">
          {truncatedContent}
        </span>
      )}
    </button>
  )
}

export function MessageItem({
  message,
  showHeader,
  currentUserId,
  isBlocked = false,
  onReact,
  onReply,
  onDelete,
  onEdit,
  onTogglePin,
  canPin = false,
  mentionCandidates,
}: MessageItemProps) {
  const author = message.author
  const [isActionBarPinned, setIsActionBarPinned] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showBlockedContent, setShowBlockedContent] = useState(false)
  const isOwnMessage = !!currentUserId && currentUserId === message.authorId
  const isReply = message.type === "reply"

  const handleCopyText = useCallback(() => {
    if (!message.content) return

    void navigator.clipboard.writeText(message.content).catch(() => {})
  }, [message.content])

  const handleReact = useCallback(
    (emoji: string) => {
      if (!currentUserId) return
      if (!onReact) return

      onReact(message.id, emoji)
    },
    [currentUserId, message.id, onReact]
  )

  const handleReply = useCallback(() => {
    onReply?.(message)
  }, [message, onReply])

  const handleDeleteRequest = useCallback(() => {
    setIsDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    onDelete?.(message.id)
    setIsDeleteDialogOpen(false)
  }, [message.id, onDelete])

  const handleTogglePin = useCallback(() => {
    onTogglePin?.(message.id, message.pinned)
  }, [message.id, message.pinned, onTogglePin])

  const handleEditRequest = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleEditSave = useCallback(
    (content: string) => {
      onEdit?.(message.id, content)
      setIsEditing(false)
    },
    [message.id, onEdit]
  )

  const handleEditCancel = useCallback(() => {
    setIsEditing(false)
  }, [])

  if (isBlocked && !showBlockedContent) {
    return (
      <div data-message-id={message.id} className="px-4 py-1">
        <button
          type="button"
          className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          onClick={() => setShowBlockedContent(true)}
        >
          Blocked message — click to reveal
        </button>
      </div>
    )
  }

  return (
    <div
      data-message-id={message.id}
      className="group relative px-4 py-0.5 hover:bg-muted/40"
    >
      <div
        className={cn(
          "absolute top-0 right-4 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-100",
          "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100",
          isActionBarPinned && "pointer-events-auto opacity-100"
        )}
      >
        <MessageActionBar
          onReact={handleReact}
          onReply={handleReply}
          onCopyText={handleCopyText}
          onEdit={isOwnMessage && onEdit ? handleEditRequest : undefined}
          onDelete={isOwnMessage && onDelete ? handleDeleteRequest : undefined}
          onTogglePin={canPin ? handleTogglePin : undefined}
          isPinned={message.pinned}
          canManageMessage={isOwnMessage}
          canPin={canPin}
          onOverlayOpenChange={setIsActionBarPinned}
        />
      </div>
      {message.pinned && (
        <div className="mb-0.5 flex items-center gap-1.5 pl-[52px] text-xs text-muted-foreground">
          <Pin className="size-3" />
          <span>Pinned</span>
        </div>
      )}
      {isReply && (
        <ReplyPreview referencedMessage={message.referencedMessage} />
      )}
      <div className="flex gap-3">
        {showHeader ? (
          <UserProfilePopover userId={author.id} side="right" align="start">
            <button type="button" className="mt-0.5 cursor-pointer">
              <Avatar size="lg">
                {author.image && (
                  <AvatarImage src={author.image} alt={author.name} />
                )}
                <AvatarFallback className="text-xs font-semibold">
                  {nameInitial(author.displayUsername ?? author.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </UserProfilePopover>
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
              <UserProfilePopover userId={author.id} side="right" align="start">
                <button
                  type="button"
                  className="cursor-pointer text-sm font-semibold leading-snug hover:underline"
                >
                  {author.displayUsername ?? author.name}
                </button>
              </UserProfilePopover>
              <span className="text-xs text-muted-foreground">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}
          {isEditing ? (
            <MessageEditInput
              initialContent={message.content ?? ""}
              onSave={handleEditSave}
              onCancel={handleEditCancel}
              mentionCandidates={mentionCandidates}
            />
          ) : (
            <MessageMarkdown
              content={message.content}
              mentions={message.mentions}
              editedAt={message.editedAt}
            />
          )}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentGrid attachments={message.attachments} />
          )}
          {message.embeds.length > 0 && (
            <div className="flex flex-col gap-1">
              {message.embeds.map((embed, index) => (
                <EmbedCard key={`${embed.url}-${index}`} embed={embed} />
              ))}
            </div>
          )}
          {message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map((reaction) => {
                const reactors = reaction.reactors ?? []
                const names = reactors.map((r) =>
                  r.id === currentUserId ? "You" : r.name
                )
                const tooltipText =
                  names.length > 0
                    ? `${names.join(", ")} reacted with ${reaction.emoji}`
                    : `${reaction.count} reaction${reaction.count !== 1 ? "s" : ""}`

                return (
                  <Tooltip key={reaction.emoji}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleReact(reaction.emoji)}
                        aria-pressed={reaction.reactedByCurrentUser}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                          reaction.reactedByCurrentUser
                            ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
                            : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.count}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{tooltipText}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
