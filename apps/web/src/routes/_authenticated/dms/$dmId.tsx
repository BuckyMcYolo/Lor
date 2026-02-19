import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChatView } from "@/components/chat/chat-view"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/_authenticated/dms/$dmId")({
  component: DMConversation,
})

function DMConversation() {
  const { dmId } = Route.useParams()

  const { data: dm, isPending } = useQuery({
    queryKey: ["dms", dmId],
    queryFn: async () => {
      const res = await apiClient.v1.dms[":dmId"].$get({ param: { dmId } })
      if (!res.ok) throw new Error("Failed to fetch DM")
      return res.json()
    },
  })

  if (isPending) return null

  if (!dm) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          Conversation not found
        </span>
      </div>
    )
  }

  const context =
    dm.type === "group_dm"
      ? {
          type: "group_dm" as const,
          name: dm.name ?? dm.members.map((m) => m.name).join(", "),
          memberCount: dm.members.length,
        }
      : {
          type: "dm" as const,
          name: dm.members[0]?.name ?? "Unknown",
          avatarUrl: dm.members[0]?.image ?? undefined,
        }

  return <ChatView context={context} />
}
