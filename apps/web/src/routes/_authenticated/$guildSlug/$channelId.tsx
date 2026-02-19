import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChatView } from "@/components/chat/chat-view"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/_authenticated/$guildSlug/$channelId")({
  component: ChannelView,
})

function ChannelView() {
  const { guildSlug, channelId } = Route.useParams()

  const { data, isPending } = useQuery({
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

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Channel not found</span>
      </div>
    )
  }

  return (
    <ChatView
      context={{
        type: "channel",
        name: data.name ?? channelId,
        topic: data.topic ?? undefined,
      }}
    />
  )
}
