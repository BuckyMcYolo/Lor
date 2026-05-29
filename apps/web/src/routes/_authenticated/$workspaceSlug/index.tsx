import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createFileRoute("/_authenticated/$workspaceSlug/")({
  component: WorkspaceHome,
})

function WorkspaceHome() {
  const { workspaceSlug } = Route.useParams()
  const navigate = useNavigate()

  useEffect(() => {
    let lastChannelId: string | null = null
    try {
      if (typeof window !== "undefined") {
        lastChannelId = localStorage.getItem(`last-channel:${workspaceSlug}`)
      }
    } catch {
      // localStorage may be unavailable in restricted environments
    }
    if (lastChannelId) {
      void navigate({
        to: "/$workspaceSlug/$channelId",
        params: { workspaceSlug, channelId: lastChannelId },
        replace: true,
      })
    }
  }, [workspaceSlug, navigate])

  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-sm text-muted-foreground">
        Select a channel to start chatting
      </span>
    </div>
  )
}
