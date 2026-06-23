import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { cn } from "@repo/ui/lib/utils"
import { timeAgo } from "@repo/utils/date"
import { MessagesSquare, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ThreadActivity } from "@/hooks/use-thread-activity"
import type { Message } from "@/lib/api-types"
import { STORED_MENTION_REGEX } from "@/lib/editor-utils"

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

// Turn stored `<@uuid>` tokens into readable `@name` for the one-line preview.
function renderMentions(content: string, mentions: Message["mentions"]) {
  const byId = new Map(mentions.map((m) => [m.id, m]))
  return content.replace(STORED_MENTION_REGEX, (_match, id: string) => {
    const mention = byId.get(id)
    const label =
      mention?.displayUsername ??
      mention?.username ??
      mention?.name ??
      "unknown"
    return `@${label}`
  })
}

// Newest reply, formatted like a notification preview: "Author: message".
function previewText(activity: ThreadActivity) {
  const reply = activity.lastReply
  const author = reply?.authorName ? `${reply.authorName}: ` : ""
  const trimmed = reply?.content?.replace(/\s+/g, " ").trim()
  if (trimmed)
    return `${author}${renderMentions(trimmed, reply?.mentions ?? [])}`
  if (reply?.hasAttachments) return `${author}sent an attachment`
  return "New reply"
}

function ThreadActivityCard({
  activity,
  onOpen,
  onDismiss,
}: {
  activity: ThreadActivity
  onOpen: (threadRootId: string) => void
  onDismiss: (threadRootId: string) => void
}) {
  const replyLabel =
    activity.replyCount === 1 ? "1 reply" : `${activity.replyCount} replies`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => onOpen(activity.threadRootId)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border/70 bg-sidebar/60 py-1.5 pr-9 pl-2.5 text-left text-[12.5px]",
          "transition-colors hover:border-border hover:bg-sidebar"
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MessagesSquare className="size-3.5" strokeWidth={2.25} />
        </span>
        <div className="flex shrink-0 -space-x-1.5">
          {activity.participants.slice(0, 3).map((p) => (
            <span
              key={p.id}
              className="rounded-md ring-2 ring-sidebar transition-[box-shadow]"
            >
              <Avatar
                size="sm"
                className="size-[18px] rounded-md [&_[data-slot=avatar-image]]:rounded-md [&_[data-slot=avatar-fallback]]:rounded-md"
              >
                {p.image && <AvatarImage src={p.image} alt={p.name} />}
                <AvatarFallback className="rounded-md text-[9px] font-semibold">
                  {nameInitial(p.displayUsername ?? p.name)}
                </AvatarFallback>
              </Avatar>
            </span>
          ))}
        </div>
        <span className="shrink-0 font-semibold text-primary group-hover:underline">
          {replyLabel}
        </span>
        <span className="truncate text-muted-foreground">
          {previewText(activity)}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/80">
          {timeAgo(activity.lastReplyAt)}
        </span>
      </button>
      <button
        type="button"
        aria-label="Dismiss thread activity"
        onClick={() => onDismiss(activity.threadRootId)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  )
}

export function ThreadActivityStack({
  activities,
  onOpen,
  onDismiss,
}: {
  activities: ThreadActivity[]
  onOpen: (threadRootId: string) => void
  onDismiss: (threadRootId: string) => void
}) {
  if (activities.length === 0) return null

  return (
    <div className="flex shrink-0 flex-col gap-1 px-4 pb-1.5">
      <AnimatePresence initial={false}>
        {activities.map((activity) => (
          <ThreadActivityCard
            key={activity.threadRootId}
            activity={activity}
            onOpen={onOpen}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
