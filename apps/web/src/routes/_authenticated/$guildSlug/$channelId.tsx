import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChatHeader } from "@/components/chat/header"
import { MessageInput } from "@/components/chat/message-input"
import { MessageList } from "@/components/chat/message-list"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/_authenticated/$guildSlug/$channelId")({
  component: ChannelView,
})

function ChannelView() {
  const { guildSlug, channelId } = Route.useParams()

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["channel", guildSlug, channelId],
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].channels[
        ":channelId"
      ].$get({
        param: { guildSlug, channelId },
      })
      if (!res.ok) throw new Error("Failed to fetch channel")
      return res.json()
    },
  })

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load channel"}
        </span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Channel not found</span>
      </div>
    )
  }

  const context = {
    type: "channel" as const,
    name: data.name ?? channelId,
    topic: data.topic ?? undefined,
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader context={context} />
      <MessageList context={context} messages={[]} />
      <MessageInput context={context} onSend={() => {}} />
    </div>
  )
}
