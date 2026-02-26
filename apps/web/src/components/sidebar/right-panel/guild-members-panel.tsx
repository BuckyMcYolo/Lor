import type { PresenceUserUpdate } from "@repo/realtime-types"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Users } from "lucide-react"
import { useEffect, useMemo } from "react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"
import type {
  GuildMemberPresence,
  ListGuildMembersResponse,
} from "@/lib/api-types"
import type { GuildMembersSidebarView } from "./right-sidebar-types"

const statusStyles: Record<GuildMemberPresence["status"], string> = {
  online: "bg-emerald-500",
  offline: "bg-muted-foreground/40",
}

const statusLabel: Record<GuildMemberPresence["status"], string> = {
  online: "Online",
  offline: "Offline",
}

function formatRole(role: GuildMemberPresence["role"]) {
  if (!role) return "Member"
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function MembersSkeleton() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          key={index}
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

function MemberRow({ member }: { member: GuildMemberPresence }) {
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
  const socket = useSocket()
  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => ["guild-members", view.guildSlug] as const,
    [view.guildSlug]
  )

  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].members.$get({
        param: { guildSlug: view.guildSlug },
      })
      if (!res.ok) throw new Error("Failed to fetch guild members")
      return res.json()
    },
  })

  useEffect(() => {
    if (!socket || !data?.guildId) return

    const applySnapshot = (onlineUserIds: string[]) => {
      const onlineSet = new Set(onlineUserIds)
      queryClient.setQueryData<ListGuildMembersResponse>(
        queryKey,
        (current) => {
          if (!current) return current
          return {
            ...current,
            members: current.members.map((member) => ({
              ...member,
              status: onlineSet.has(member.userId) ? "online" : "offline",
            })),
          }
        }
      )
    }

    const requestSnapshot = () => {
      socket.emit("presence:subscribe", { guildId: data.guildId }, (result) => {
        if (!result.ok) return
        applySnapshot(result.snapshot.onlineUserIds)
      })
    }

    const onPresenceReady = () => {
      requestSnapshot()
    }

    const onConnect = () => {
      requestSnapshot()
    }

    const onPresenceUpdate = (payload: PresenceUserUpdate) => {
      if (payload.guildId !== data.guildId) return
      const nextStatus: GuildMemberPresence["status"] =
        payload.status === "offline" ? "offline" : "online"

      queryClient.setQueryData<ListGuildMembersResponse>(
        queryKey,
        (current) => {
          if (!current) return current
          return {
            ...current,
            members: current.members.map((member) =>
              member.userId === payload.userId
                ? { ...member, status: nextStatus }
                : member
            ),
          }
        }
      )
    }

    socket.on("presence:ready", onPresenceReady)
    socket.on("connect", onConnect)
    socket.on("presence:user:update", onPresenceUpdate)

    if (socket.connected) {
      requestSnapshot()
    }

    return () => {
      socket.off("presence:ready", onPresenceReady)
      socket.off("connect", onConnect)
      socket.off("presence:user:update", onPresenceUpdate)
    }
  }, [socket, data?.guildId, queryClient, queryKey])

  const members = data?.members ?? []
  const onlineMembers = members.filter((member) => member.status !== "offline")
  const offlineMembers = members.filter((member) => member.status === "offline")
  const guildName = data?.guildName?.trim() || "Guild"

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{guildName} Members</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {members.length} total members
        </p>
      </div>

      {isPending ? (
        <MembersSkeleton />
      ) : isError ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          Failed to load members.
        </div>
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
                    Online - {onlineMembers.length}
                  </div>
                  <div className="space-y-0.5">
                    {onlineMembers.map((member) => (
                      <MemberRow key={member.userId} member={member} />
                    ))}
                  </div>
                </section>
              )}

              {offlineMembers.length > 0 && (
                <section>
                  <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Offline - {offlineMembers.length}
                  </div>
                  <div className="space-y-0.5">
                    {offlineMembers.map((member) => (
                      <MemberRow key={member.userId} member={member} />
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
