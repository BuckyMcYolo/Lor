import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { Hash, PanelRight, Pin } from "lucide-react"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"
import { HeaderSearch } from "./header-search"

export type ChatContext =
  | { type: "channel"; name: string; topic?: string }
  | { type: "dm"; name: string; avatarUrl?: string }
  | { type: "group_dm"; name: string; memberCount: number }

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

export function ChatHeader({
  context,
  channelId,
  onTogglePinnedMessages,
}: {
  context: ChatContext
  channelId: string
  onTogglePinnedMessages?: () => void
}) {
  const { isCollapsed, toggleCollapsed } = useRightSidebar()

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
      <div className="ml-auto flex items-center gap-1">
        <HeaderSearch
          mode={context.type === "channel" ? "guild" : "dm"}
          channelId={channelId}
        />
        {context.type === "channel" && onTogglePinnedMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onTogglePinnedMessages}
                className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Pin className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Pinned Messages</TooltipContent>
          </Tooltip>
        )}
        {isCollapsed && context.type === "channel" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <PanelRight className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Show Members</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
