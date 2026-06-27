import { Pin02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
import { formatTime, timeAgo } from "@repo/utils/date"
import { ChevronRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import type { MentionCandidate } from "@/components/chat/composer/mention-types"
import { EmbedCard } from "@/components/chat/embed-card"
import { MessageActionBar } from "@/components/chat/message-action-bar"
import { AttachmentGrid } from "@/components/chat/message-attachment"
import { MessageEditInput } from "@/components/chat/message-edit-input"
import { MessageMarkdown } from "@/components/chat/message-markdown"
import { UserProfilePopover } from "@/components/ui/user-profile-card"
import type { Message } from "@/lib/api-types"

interface MessageItemProps {
  message: Message
  showHeader: boolean
  currentUserId?: string
  isBlocked?: boolean
  isReplyTarget?: boolean
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onReplyInThread?: (message: Message) => void
  onOpenThread?: (rootMessageId: string) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void
  canPin?: boolean
  mentionCandidates?: MentionCandidate[]
  onJumpToMessage?: (messageId: string) => void
}

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

function ReplyPreview({
  referencedMessage,
  onJumpToMessage,
}: {
  referencedMessage: Message["referencedMessage"]
  onJumpToMessage?: (messageId: string) => void
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
      onClick={() => onJumpToMessage?.(referencedMessage.id)}
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

function ThreadFooter({
  summary,
  onClick,
}: {
  summary: NonNullable<Message["threadSummary"]>
  onClick: () => void
}) {
  const replyLabel =
    summary.replyCount === 1 ? "1 reply" : `${summary.replyCount} replies`
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/thread mt-1.5 flex w-full max-w-[480px] items-center gap-2 rounded-lg border border-transparent py-1 pr-2 pl-1 text-[12.5px]",
        // `bg-sidebar` is the one token below `--background` in the surface
        // hierarchy — gives a "deeper / pressed-in" hover in both themes.
        "transition-colors hover:border-border/70 hover:bg-sidebar/50 cursor-pointer"
      )}
    >
      <div className="flex shrink-0 -space-x-1.5">
        {summary.participants.slice(0, 3).map((p) => (
          <span
            key={p.id}
            className="rounded-md ring-2 ring-background transition-[box-shadow] group-hover/thread:ring-card"
          >
            <Avatar
              size="sm"
              className="size-[22px] rounded-md [&_[data-slot=avatar-image]]:rounded-md [&_[data-slot=avatar-fallback]]:rounded-md"
            >
              {p.image && <AvatarImage src={p.image} alt={p.name} />}
              <AvatarFallback className="rounded-md text-[10px] font-semibold">
                {nameInitial(p.displayUsername ?? p.name)}
              </AvatarFallback>
            </Avatar>
          </span>
        ))}
      </div>
      <span className="shrink-0 font-semibold text-primary group-hover/thread:underline">
        {replyLabel}
      </span>
      <span className="truncate text-muted-foreground">
        Last reply {timeAgo(summary.lastReplyAt)}
      </span>
      <ChevronRight
        className="-mr-0.5 ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/thread:opacity-100"
        strokeWidth={2.25}
      />
    </button>
  )
}

export function MessageItem({
  message,
  showHeader,
  currentUserId,
  isBlocked = false,
  isReplyTarget = false,
  onReact,
  onReply,
  onReplyInThread,
  onOpenThread,
  onDelete,
  onEdit,
  onTogglePin,
  canPin = false,
  mentionCandidates,
  onJumpToMessage,
}: MessageItemProps) {
  const author = message.author
  const [isActionBarPinned, setIsActionBarPinned] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showBlockedContent, setShowBlockedContent] = useState(false)

  useEffect(() => {
    setShowBlockedContent(false)
  }, [message.id])

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

  const handleReplyInThread = useCallback(() => {
    onReplyInThread?.(message)
  }, [message, onReplyInThread])

  const handleOpenThread = useCallback(() => {
    onOpenThread?.(message.id)
  }, [message.id, onOpenThread])

  // Channel-level messages (not thread replies) can host a thread.
  const canStartThread = !message.threadRootId && !!onReplyInThread

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
      className={cn(
        "group relative px-4 py-0.5 transition-colors",
        isReplyTarget
          ? "bg-primary/[0.07] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary"
          : "hover:bg-muted/40"
      )}
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
          onReplyInThread={canStartThread ? handleReplyInThread : undefined}
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
          <HugeiconsIcon icon={Pin02Icon} size={12} />
          <span>Pinned</span>
        </div>
      )}
      {isReply && (
        <ReplyPreview
          referencedMessage={message.referencedMessage}
          onJumpToMessage={onJumpToMessage}
        />
      )}
      <div className="flex gap-3">
        {showHeader ? (
          <UserProfilePopover userId={author.id} side="right" align="start">
            <button type="button" className="mt-0.5 cursor-pointer self-start">
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
          ) : message.streaming && !message.content ? (
            <span className="inline-flex items-center text-sm text-muted-foreground italic">
              Merlin is thinking
              <span className="ml-1 animate-pulse">…</span>
            </span>
          ) : (
            <MessageMarkdown
              content={message.content}
              mentions={message.mentions}
              editedAt={message.editedAt}
              onCitationJump={onJumpToMessage}
            />
          )}
          {message.streaming &&
            message.toolActivity &&
            message.toolActivity.length > 0 && (
              <div className="mt-1 flex flex-col gap-0.5">
                {message.toolActivity.map((t) => (
                  <span
                    key={t.toolCallId}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground italic"
                  >
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          {message.remembered && message.remembered.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.remembered.map((r) => (
                <span
                  key={r.path}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  🧠 {r.action === "created" ? "saved" : "updated"} {r.path}
                </span>
              ))}
            </div>
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
          {message.threadSummary && message.threadSummary.replyCount > 0 && (
            <ThreadFooter
              summary={message.threadSummary}
              onClick={handleOpenThread}
            />
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
