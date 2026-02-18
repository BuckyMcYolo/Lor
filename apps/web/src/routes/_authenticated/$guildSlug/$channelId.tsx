import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/$guildSlug/$channelId")({
  component: ChannelView,
})

function ChannelView() {
  const { channelId } = Route.useParams()

  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-sm text-muted-foreground">Channel {channelId}</span>
    </div>
  )
}
