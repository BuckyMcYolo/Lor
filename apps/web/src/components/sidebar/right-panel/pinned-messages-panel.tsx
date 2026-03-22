import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { formatTime } from "@repo/utils/date"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, PanelRight, Pin } from "lucide-react"
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
  const { setView, toggleCollapsed } = useRightSidebar()

  const goBack = () => {
    setView({
      type: "guild-members",
      guildSlug: view.guildSlug,
      channelId: view.channelId,
    })
  }

  const { data, isPending } = useQuery({
    queryKey: ["pinned-messages", view.channelId],
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].channels[
        ":channelId"
      ].pins.$get({
        param: { guildSlug: view.guildSlug, channelId: view.channelId },
      })
      if (!res.ok) throw new Error("Failed to fetch pinned messages")
      return res.json()
    },
  })

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <button
          type="button"
          onClick={goBack}
          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Pin className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Pinned Messages</span>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelRight className="size-4" />
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
            <Pin className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No pinned messages yet
            </p>
          </div>
        )}
        {data?.data.map((msg) => (
          <div
            key={msg.id}
            className="border-b border-border/50 px-4 py-3 hover:bg-muted/30"
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
