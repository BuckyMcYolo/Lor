import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { useParams } from "@tanstack/react-router"
import { Menu, PanelRight, Pin, Scroll } from "lucide-react"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"
import { useMobileSidebar } from "@/context/mobile-sidebar-context"
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
  const { view, setView, clearView, isCollapsed, toggleCollapsed } =
    useRightSidebar()
  const isMobile = useIsMobile()
  const { setOpen: openMobileSidebar } = useMobileSidebar()
  const { workspaceSlug } = useParams({ strict: false })

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      {isMobile && (
        <button
          type="button"
          onClick={() => openMobileSidebar(true)}
          className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
      )}
      {context.type === "channel" && (
        <Scroll className="size-5 shrink-0 text-muted-foreground" />
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
          mode={context.type === "channel" ? "workspace" : "dm"}
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
        {context.type === "channel" &&
          (isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (view) {
                      clearView()
                    } else {
                      setView({
                        type: "workspace-members",
                        workspaceSlug: workspaceSlug ?? "",
                        channelId,
                      })
                    }
                  }}
                  className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <PanelRight className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Members</TooltipContent>
            </Tooltip>
          ) : (
            isCollapsed && (
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
                <TooltipContent>Show Panel</TooltipContent>
              </Tooltip>
            )
          ))}
      </div>
    </div>
  )
}
