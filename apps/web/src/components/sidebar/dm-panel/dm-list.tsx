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
import { UserAvatar } from "@/components/ui/user-avatar"
import { useMobileSidebar } from "@/context/mobile-sidebar-context"
import { useUnread } from "@/context/unread-context"
import { apiClient } from "@/lib/api-client"
import type { DMember } from "@/lib/api-types"

export function DMList() {
  const navigate = useNavigate()
  const { dmId } = useParams({ strict: false })
  const { setOpen: closeMobileSidebar } = useMobileSidebar()

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
            channelId={dm.id}
            name={displayName}
            members={dm.members}
            lastMessage={dm.lastMessage?.content ?? null}
            lastMessageAuthor={dm.lastMessage?.author.name ?? null}
            isGroupDM={dm.type === "group_dm"}
            active={dmId === dm.id}
            onClick={() => {
              navigate({ to: "/dms/$dmId", params: { dmId: dm.id } })
              closeMobileSidebar(false)
            }}
          />
        )
      })}
    </nav>
  )
}

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
  channelId,
  name,
  members,
  lastMessage,
  lastMessageAuthor,
  isGroupDM,
  active = false,
  onClick,
}: {
  channelId: string
  name: string
  members: DMember[]
  lastMessage: string | null
  lastMessageAuthor: string | null
  isGroupDM: boolean
  active?: boolean
  onClick?: () => void
}) {
  const { getUnreadCount, getMentionCount } = useUnread()
  const unreadCount = active ? 0 : getUnreadCount(channelId)
  const mentionCount = active ? 0 : getMentionCount(channelId)
  const hasUnread = unreadCount > 0

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
        active && "bg-foreground/[0.06] text-foreground",
        !active && hasUnread && "text-foreground",
        !active && !hasUnread && "text-muted-foreground"
      )}
    >
      {!active && hasUnread && (
        <div className="absolute left-0 top-1/2 h-2 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground" />
      )}
      {isGroupDM ? (
        <GroupDMAvatars members={members} />
      ) : (
        <UserAvatar name={members[0]?.name} src={members[0]?.image} size="sm" />
      )}
      <div className="min-w-0 flex-1 text-left">
        <div
          className={cn(
            "truncate text-[14px] leading-tight",
            hasUnread ? "font-semibold" : "font-medium"
          )}
        >
          {name}
        </div>
        {preview && (
          <div className="truncate text-[12px] leading-tight text-muted-foreground">
            {preview}
          </div>
        )}
      </div>
      {mentionCount > 0 && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {mentionCount}
        </span>
      )}
    </button>
  )
}
