import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@repo/ui/components/avatar"
import { cn } from "@repo/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { apiClient } from "@/lib/api-client"
import { UserAvatar } from "../../ui/user-avatar"

export function DMList() {
  const navigate = useNavigate()
  const { dmId } = useParams({ strict: false })

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
      {data.data.map((dm) => {
        const displayName =
          dm.type === "group_dm"
            ? (dm.name ?? dm.members.map((m) => m.name).join(", "))
            : (dm.members[0]?.name ?? "Unknown")

        return (
          <DMItem
            key={dm.id}
            name={displayName}
            members={dm.members}
            lastMessage={dm.lastMessage?.content ?? null}
            lastMessageAuthor={dm.lastMessage?.author.name ?? null}
            isGroupDM={dm.type === "group_dm"}
            active={dmId === dm.id}
            onClick={() =>
              navigate({ to: "/dms/$dmId", params: { dmId: dm.id } })
            }
          />
        )
      })}
    </nav>
  )
}

type DMember = { id: string; name: string | null; image: string | null }

function getInitials(name: string | null) {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?"
  )
}

function GroupDMAvatars({ members }: { members: DMember[] }) {
  const shown = members.slice(0, 2)
  const overflow = members.length - shown.length

  return (
    <AvatarGroup className="shrink-0">
      {shown.map((m) => (
        <Avatar key={m.id} size="sm">
          {m.image && <AvatarImage src={m.image} alt={m.name ?? ""} />}
          <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <AvatarGroupCount className="text-[10px]">+{overflow}</AvatarGroupCount>
      )}
    </AvatarGroup>
  )
}

function DMItem({
  name,
  members,
  lastMessage,
  lastMessageAuthor,
  isGroupDM,
  active = false,
  onClick,
}: {
  name: string
  members: DMember[]
  lastMessage: string | null
  lastMessageAuthor: string | null
  isGroupDM: boolean
  active?: boolean
  onClick?: () => void
}) {
  const preview =
    isGroupDM && lastMessageAuthor && lastMessage
      ? `${lastMessageAuthor}: ${lastMessage}`
      : lastMessage

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-foreground/[0.06]",
        active
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground"
      )}
    >
      {isGroupDM ? (
        <GroupDMAvatars members={members} />
      ) : (
        <UserAvatar name={members[0]?.name} src={members[0]?.image} size="sm" />
      )}
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
    </button>
  )
}
