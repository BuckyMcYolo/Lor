import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createFileRoute("/_authenticated/$guildSlug/")({
  component: GuildHome,
})

function GuildHome() {
  const { guildSlug } = Route.useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const lastChannelId = localStorage.getItem(`last-channel:${guildSlug}`)
    if (lastChannelId) {
      void navigate({
        to: "/$guildSlug/$channelId",
        params: { guildSlug, channelId: lastChannelId },
        replace: true,
      })
    }
  }, [guildSlug, navigate])

  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-sm text-muted-foreground">
        Select a channel to start chatting
      </span>
    </div>
  )
}
