import { cn } from "@repo/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { UserAvatar } from "../../ui/user-avatar"

export function DMList() {
  const { data } = useQuery({
    queryKey: ["dms"],
    queryFn: async () => {
      const res = await apiClient.v1.dms.$get({ query: {} })
      if (!res.ok) throw new Error("Failed to fetch DMs")
      return res.json()
    },
  })

  if (!data || data.data.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
        <p>No conversations yet.</p>
      </div>
    )
  }

  return (
    <nav className="space-y-0.5">
      {data.data.map((dm) => (
        <DMItem
          key={dm.id}
          name={dm.name ?? "Unknown"}
          lastMessage={dm.lastMessage?.content ?? null}
          lastMessageAuthor={dm.lastMessage?.author.name ?? null}
          isGroupDM={dm.type === "group_dm"}
        />
      ))}
    </nav>
  )
}

function DMItem({
  name,
  lastMessage,
  lastMessageAuthor,
  isGroupDM,
  active = false,
}: {
  name: string
  lastMessage: string | null
  lastMessageAuthor: string | null
  isGroupDM: boolean
  active?: boolean
}) {
  const preview =
    isGroupDM && lastMessageAuthor && lastMessage
      ? `${lastMessageAuthor}: ${lastMessage}`
      : lastMessage

  return (
    <button
      type="button"
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-foreground/[0.06]",
        active
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground"
      )}
    >
      <UserAvatar name={name} size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[14px] font-medium leading-tight">
          {name}
        </div>
        {preview && (
          <div className="truncate text-[12px] leading-tight text-muted-foreground">
            {preview}
          </div>
        )}
      </div>
      <X className="hidden size-4 shrink-0 text-muted-foreground group-hover:block" />
    </button>
  )
}
