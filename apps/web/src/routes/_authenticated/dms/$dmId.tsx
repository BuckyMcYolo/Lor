import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dms/$dmId")({
  component: DMConversation,
})

function DMConversation() {
  const { dmId } = Route.useParams()

  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-sm text-muted-foreground">
        DM conversation {dmId}
      </span>
    </div>
  )
}
