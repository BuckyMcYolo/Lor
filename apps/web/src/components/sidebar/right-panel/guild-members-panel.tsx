import type { ActiveGuild, ActiveGuildMember } from "@repo/auth"
import { authClient } from "@repo/auth/client"
import type { PresenceStatus } from "@repo/realtime-types"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Users } from "lucide-react"
import { useMemo } from "react"
import { UserAvatar } from "../../ui/user-avatar"
import type { GuildMembersSidebarView } from "./right-sidebar-types"

function mapGuildMembersToRows(
  members: ActiveGuild["members"] | undefined,
  sessionUserId: string | null,
  presenceByUserId?: Record<string, PresenceStatus>
) {
  return (members ?? [])
    .map((member: ActiveGuildMember) => {
      const id = member.user?.id ?? member.userId ?? member.id
      const fallbackName = member.user?.email ?? "Unknown member"
      return {
        id,
        name: member.user?.name?.trim() || fallbackName,
        image: member.user?.image ?? null,
        role: member.role ?? "member",
        status:
          presenceByUserId?.[id] ??
          (id === sessionUserId ? "online" : "offline"),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

type GuildMemberRow = ReturnType<typeof mapGuildMembersToRows>[number]

const statusStyles: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  offline: "bg-muted-foreground/40",
  idle: "bg-amber-500",
  dnd: "bg-rose-500",
}

const statusLabel: Record<PresenceStatus, string> = {
  online: "Online",
  offline: "Offline",
  idle: "Idle",
  dnd: "Do Not Disturb",
}

function formatRole(role: string) {
  if (!role) return "Member"
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function MemberSkeleton() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          key={i}
          className="flex items-center gap-2 rounded-md px-1.5 py-1.5"
        >
          <Skeleton className="size-8 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MemberRow({ member }: { member: GuildMemberRow }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-foreground/[0.04]">
      <div className="relative">
        <UserAvatar name={member.name} src={member.image} size="sm" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-card",
            statusStyles[member.status]
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{member.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {formatRole(member.role)}
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground">
        {statusLabel[member.status]}
      </span>
    </div>
  )
}

export function GuildMembersPanel({ view }: { view: GuildMembersSidebarView }) {
  const { data: session } = authClient.useSession()

  const { data: guild, isPending } = useQuery<ActiveGuild | null>({
    queryKey: ["active-guild", view.guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getFullOrganization()
      return res.data ?? null
    },
  })

  const members = useMemo(() => {
    const sessionUserId = session?.user.id ?? null
    return mapGuildMembersToRows(
      guild?.members,
      sessionUserId,
      view.presenceByUserId
    )
  }, [guild?.members, session?.user.id, view.presenceByUserId])

  const onlineMembers = members.filter((member) => member.status !== "offline")
  const offlineMembers = members.filter((member) => member.status === "offline")
  const guildName = guild?.name?.trim() || "Guild"

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{guildName} Members</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {members.length} total • presence is currently mocked
        </p>
      </div>

      {isPending ? (
        <MemberSkeleton />
      ) : (
        <ScrollArea className="flex-1 px-2 py-2">
          {members.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">
              No members found for this guild.
            </div>
          ) : (
            <div className="space-y-4 px-1 pb-3">
              {onlineMembers.length > 0 && (
                <section>
                  <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Online — {onlineMembers.length}
                  </div>
                  <div className="space-y-0.5">
                    {onlineMembers.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </div>
                </section>
              )}

              {offlineMembers.length > 0 && (
                <section>
                  <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Offline — {offlineMembers.length}
                  </div>
                  <div className="space-y-0.5">
                    {offlineMembers.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  )
}
