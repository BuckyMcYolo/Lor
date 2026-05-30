import { Pin02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { SidebarToggleIcon } from "@repo/ui/components/unlumen-ui/sidebar-toggle-icon"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { formatTime } from "@repo/utils/date"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { MessageMarkdown } from "@/components/chat/message-markdown"
import { apiClient } from "@/lib/api-client"
import { useRightSidebar } from "./right-sidebar-context"
import type { PinnedMessagesSidebarView } from "./right-sidebar-types"

function nameInitial(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?"
}

export function PinnedMessagesPanel({
  view,
}: {
  view: PinnedMessagesSidebarView
}) {
  const { setView, toggleCollapsed, clearView } = useRightSidebar()
  const isMobile = useIsMobile()

  const goBack = () => {
    setView({
      type: "workspace-members",
      workspaceSlug: view.workspaceSlug,
      channelId: view.channelId,
    })
  }

  const { data, isPending } = useQuery({
    queryKey: ["pinned-messages", view.channelId],
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
        ":channelId"
      ].pins.$get({
        param: { workspaceSlug: view.workspaceSlug, channelId: view.channelId },
      })
      if (!res.ok) throw new Error("Failed to fetch pinned messages")
      return res.json()
    },
  })

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Pinned Messages
        </span>
        <button
          type="button"
          onClick={isMobile ? clearView : toggleCollapsed}
          aria-label="Close pinned messages panel"
          className="-mr-1.5 ml-auto flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <SidebarToggleIcon
            isOpen={true}
            className="size-4 -scale-x-100"
            strokeWidth={1.5}
          />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isPending && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}
        {data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <HugeiconsIcon
              icon={Pin02Icon}
              size={32}
              className="text-muted-foreground/40"
            />
            <p className="text-sm text-muted-foreground">
              No pinned messages yet
            </p>
          </div>
        )}
        {data?.data.map((msg) => (
          <div
            key={msg.id}
            className="rounded-lg px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
          >
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                {msg.author.image && (
                  <AvatarImage src={msg.author.image} alt={msg.author.name} />
                )}
                <AvatarFallback className="text-[9px] font-semibold">
                  {nameInitial(msg.author.displayUsername ?? msg.author.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold">
                {msg.author.displayUsername ?? msg.author.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(msg.createdAt)}
              </span>
            </div>
            <div className="mt-1 pl-7 text-sm">
              <MessageMarkdown content={msg.content} mentions={msg.mentions} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
