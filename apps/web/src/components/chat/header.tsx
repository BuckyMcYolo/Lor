import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Hash } from "lucide-react"

export type ChatContext =
  | { type: "channel"; name: string; topic?: string }
  | { type: "dm"; name: string; avatarUrl?: string }
  | { type: "group_dm"; name: string; memberCount: number }

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

export function ChatHeader({ context }: { context: ChatContext }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      {context.type === "channel" && (
        <Hash className="size-5 shrink-0 text-muted-foreground" />
      )}
      {context.type === "dm" && (
        <Avatar size="sm">
          {context.avatarUrl && (
            <AvatarImage src={context.avatarUrl} alt={context.name} />
          )}
          <AvatarFallback className="text-[10px] font-semibold">
            {nameInitial(context.name)}
          </AvatarFallback>
        </Avatar>
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
