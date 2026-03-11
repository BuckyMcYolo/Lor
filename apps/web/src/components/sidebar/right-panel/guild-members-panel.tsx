import { authClient } from "@repo/auth/client"
import {
  type AssignableGuildRole,
  assignableGuildRoles,
  type GuildRole,
  isGuildRole,
} from "@repo/auth/permissions"
import type { PresenceUserUpdate } from "@repo/realtime-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import { Button } from "@repo/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"
import type {
  GuildMemberPresence,
  ListGuildMembersResponse,
} from "@/lib/api-types"
import {
  canBanGuildMembers,
  canKickGuildMembers,
  canManageGuildMember,
  canTimeoutGuildMembers,
  canUpdateGuildMemberRoles,
  formatGuildRole,
} from "@/lib/permissions"
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
  if (!role || !isGuildRole(role)) return "Citizen"
  return formatGuildRole(role)
}

function isMemberTimedOut(member: GuildMemberPresence) {
  if (!member.communicationDisabledUntil) return false
  return new Date(member.communicationDisabledUntil).getTime() > Date.now()
}

function formatTimeoutLabel(member: GuildMemberPresence) {
  if (!member.communicationDisabledUntil) return null
  const timeoutDate = new Date(member.communicationDisabledUntil)
  if (Number.isNaN(timeoutDate.getTime())) return null
  return `Timed out until ${timeoutDate.toLocaleString()}`
}

const timeoutOptions = [
  { label: "10 minutes", durationMinutes: 10 },
  { label: "1 hour", durationMinutes: 60 },
  { label: "1 day", durationMinutes: 60 * 24 },
] as const

type ModerationDialogState =
  | { type: "kick"; member: GuildMemberPresence }
  | { type: "ban"; member: GuildMemberPresence }
  | null

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

function MemberRow({
  member,
  currentUserId,
  currentRole,
  currentIsOwner,
  onRoleChange,
  onKick,
  onBan,
  onTimeout,
  onClearTimeout,
  isBusy,
}: {
  member: GuildMemberPresence
  currentUserId: string | null
  currentRole: GuildRole | null
  currentIsOwner: boolean
  onRoleChange: (member: GuildMemberPresence, role: AssignableGuildRole) => void
  onKick: (member: GuildMemberPresence) => void
  onBan: (member: GuildMemberPresence) => void
  onTimeout: (member: GuildMemberPresence, durationMinutes: number) => void
  onClearTimeout: (member: GuildMemberPresence) => void
  isBusy: boolean
}) {
  const targetRole = isGuildRole(member.role) ? member.role : null
  const canManageTarget =
    currentRole && targetRole
      ? canManageGuildMember(
          currentRole,
          targetRole,
          currentIsOwner,
          member.isOwner
        ) && currentUserId !== member.userId
      : false

  const canUpdateRole =
    currentRole && targetRole
      ? canUpdateGuildMemberRoles(currentRole) && canManageTarget
      : false
  const canKick =
    currentRole && targetRole
      ? canKickGuildMembers(currentRole) && canManageTarget
      : false
  const canBan =
    currentRole && targetRole
      ? canBanGuildMembers(currentRole) && canManageTarget
      : false
  const canTimeout =
    currentRole && targetRole
      ? canTimeoutGuildMembers(currentRole) && canManageTarget
      : false
  const showActions = canUpdateRole || canKick || canBan || canTimeout
  const timeoutLabel = formatTimeoutLabel(member)

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-foreground/[0.04]">
      <div className="relative shrink-0">
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
        {timeoutLabel && (
          <div className="truncate text-[11px] text-amber-700 dark:text-amber-400">
            {timeoutLabel}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-2">
        <span className="max-w-12 truncate text-[11px] text-muted-foreground">
          {statusLabel[member.status]}
        </span>
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isBusy}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Moderate member</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdateRole && targetRole && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={
                        assignableGuildRoles.includes(
                          targetRole as AssignableGuildRole
                        )
                          ? targetRole
                          : "member"
                      }
                      onValueChange={(value) => {
                        if (
                          !assignableGuildRoles.includes(
                            value as AssignableGuildRole
                          )
                        ) {
                          return
                        }

                        onRoleChange(member, value as AssignableGuildRole)
                      }}
                    >
                      {assignableGuildRoles.map((role) => (
                        <DropdownMenuRadioItem key={role} value={role}>
                          {formatGuildRole(role)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {canTimeout && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Timeout</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {timeoutOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.durationMinutes}
                        onClick={() =>
                          onTimeout(member, option.durationMinutes)
                        }
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                    {isMemberTimedOut(member) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onClearTimeout(member)}
                        >
                          Clear timeout
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {(canKick || canBan) && <DropdownMenuSeparator />}
              {canKick && (
                <DropdownMenuItem onClick={() => onKick(member)}>
                  Kick member
                </DropdownMenuItem>
              )}
              {canBan && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onBan(member)}
                >
                  Ban member
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function GuildMembersPanel({ view }: { view: GuildMembersSidebarView }) {
  const socket = useSocket()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [moderationDialog, setModerationDialog] =
    useState<ModerationDialogState>(null)
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
  const { data: activeMember } = useQuery({
    queryKey: ["active-guild-member", view.guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMember()
      return res.data
    },
    enabled: !!view.guildSlug,
  })
  const guildId = data?.guildId
  const currentUserId = session?.user?.id ?? null
  const activeMemberRole =
    typeof activeMember?.role === "string" ? activeMember.role : null
  const currentRole =
    activeMemberRole && isGuildRole(activeMemberRole) ? activeMemberRole : null
  const currentIsOwner = data?.ownerId === currentUserId

  const invalidateMembers = async () => {
    await queryClient.invalidateQueries({ queryKey })
  }

  const updateRoleMutation = useMutation({
    mutationFn: async (input: {
      userId: string
      role: AssignableGuildRole
    }) => {
      const res = await apiClient.v1.guilds[":guildSlug"].members[
        ":userId"
      ].role.$patch({
        param: { guildSlug: view.guildSlug, userId: input.userId },
        json: { role: input.role },
      })

      if (!res.ok) {
        throw new Error("Failed to update guild member role")
      }

      return res.json()
    },
    onSuccess: async () => {
      await invalidateMembers()
      toast.success("Role updated")
    },
    onError: () => {
      toast.error("Failed to update role")
    },
  })

  const kickMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.v1.guilds[":guildSlug"].members[
        ":userId"
      ].kick.$post({
        param: { guildSlug: view.guildSlug, userId },
      })

      if (!res.ok) {
        throw new Error("Failed to kick member")
      }
    },
    onSuccess: async () => {
      await invalidateMembers()
      setModerationDialog(null)
      toast.success("Member kicked")
    },
    onError: () => {
      toast.error("Failed to kick member")
    },
  })

  const banMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.v1.guilds[":guildSlug"].members[
        ":userId"
      ].ban.$post({
        param: { guildSlug: view.guildSlug, userId },
        json: { reason: null, expiresAt: null },
      })

      if (!res.ok) {
        throw new Error("Failed to ban member")
      }
    },
    onSuccess: async () => {
      await invalidateMembers()
      setModerationDialog(null)
      toast.success("Member banned")
    },
    onError: () => {
      toast.error("Failed to ban member")
    },
  })

  const timeoutMutation = useMutation({
    mutationFn: async (input: { userId: string; durationMinutes: number }) => {
      const res = await apiClient.v1.guilds[":guildSlug"].members[
        ":userId"
      ].timeout.$post({
        param: { guildSlug: view.guildSlug, userId: input.userId },
        json: {
          durationMinutes: input.durationMinutes,
          reason: null,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to time out member")
      }
    },
    onSuccess: async () => {
      await invalidateMembers()
      toast.success("Timeout applied")
    },
    onError: () => {
      toast.error("Failed to apply timeout")
    },
  })

  const clearTimeoutMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.v1.guilds[":guildSlug"].members[
        ":userId"
      ].timeout.$delete({
        param: { guildSlug: view.guildSlug, userId },
      })

      if (!res.ok) {
        throw new Error("Failed to clear timeout")
      }
    },
    onSuccess: async () => {
      await invalidateMembers()
      toast.success("Timeout cleared")
    },
    onError: () => {
      toast.error("Failed to clear timeout")
    },
  })

  const isMutating =
    updateRoleMutation.isPending ||
    kickMutation.isPending ||
    banMutation.isPending ||
    timeoutMutation.isPending ||
    clearTimeoutMutation.isPending

  const handleRoleChange = (
    member: GuildMemberPresence,
    role: AssignableGuildRole
  ) => {
    if (member.role === role) return
    updateRoleMutation.mutate({ userId: member.userId, role })
  }

  const handleKick = (member: GuildMemberPresence) => {
    setModerationDialog({ type: "kick", member })
  }

  const handleBan = (member: GuildMemberPresence) => {
    setModerationDialog({ type: "ban", member })
  }

  const handleTimeout = (
    member: GuildMemberPresence,
    durationMinutes: number
  ) => {
    timeoutMutation.mutate({ userId: member.userId, durationMinutes })
  }

  const handleClearTimeout = (member: GuildMemberPresence) => {
    clearTimeoutMutation.mutate(member.userId)
  }

  const handleConfirmModeration = () => {
    if (!moderationDialog) return

    if (moderationDialog.type === "kick") {
      kickMutation.mutate(moderationDialog.member.userId)
      return
    }

    banMutation.mutate(moderationDialog.member.userId)
  }

  useEffect(() => {
    if (!socket || !guildId) return

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
      if (!guildId) return

      socket.emit("presence:subscribe", { guildId }, (result) => {
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
      if (!guildId || payload.guildId !== guildId) return
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
  }, [socket, guildId, queryClient, queryKey])

  const members = data?.members ?? []
  const onlineMembers = members.filter((member) => member.status !== "offline")
  const offlineMembers = members.filter((member) => member.status === "offline")
  const guildName = data?.guildName?.trim() || "Guild"
  const isModerationDialogOpen = moderationDialog !== null
  const moderationDialogTitle =
    moderationDialog?.type === "kick" ? "Kick member" : "Ban member"
  const moderationDialogDescription =
    moderationDialog?.type === "kick"
      ? `Are you sure you want to kick ${moderationDialog.member.name} from this guild? They can rejoin if invited again.`
      : moderationDialog
        ? `Are you sure you want to ban ${moderationDialog.member.name} from this guild? They will be removed immediately and blocked from rejoining.`
        : ""
  const isModerationSubmitting =
    (moderationDialog?.type === "kick" && kickMutation.isPending) ||
    (moderationDialog?.type === "ban" && banMutation.isPending)
  const moderationActionLabel =
    moderationDialog?.type === "kick" ? "Kick member" : "Ban member"

  return (
    <>
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
          <ScrollArea className="min-w-0 flex-1 overflow-x-hidden px-2 py-2">
            {members.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">
                No members found for this guild.
              </div>
            ) : (
              <div className="min-w-0 space-y-4 px-1 pb-3">
                {onlineMembers.length > 0 && (
                  <section>
                    <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Online - {onlineMembers.length}
                    </div>
                    <div className="space-y-0.5">
                      {onlineMembers.map((member) => (
                        <MemberRow
                          key={member.userId}
                          member={member}
                          currentUserId={currentUserId}
                          currentRole={currentRole}
                          currentIsOwner={currentIsOwner}
                          onRoleChange={handleRoleChange}
                          onKick={handleKick}
                          onBan={handleBan}
                          onTimeout={handleTimeout}
                          onClearTimeout={handleClearTimeout}
                          isBusy={isMutating}
                        />
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
                        <MemberRow
                          key={member.userId}
                          member={member}
                          currentUserId={currentUserId}
                          currentRole={currentRole}
                          currentIsOwner={currentIsOwner}
                          onRoleChange={handleRoleChange}
                          onKick={handleKick}
                          onBan={handleBan}
                          onTimeout={handleTimeout}
                          onClearTimeout={handleClearTimeout}
                          isBusy={isMutating}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
      <AlertDialog
        open={isModerationDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModerationDialog(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{moderationDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {moderationDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isModerationSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={isModerationSubmitting}
              onClick={handleConfirmModeration}
            >
              {moderationActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
