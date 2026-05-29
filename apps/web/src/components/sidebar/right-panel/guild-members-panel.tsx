import { authClient } from "@repo/auth/client"
import {
  type AssignableGuildRole,
  assignableGuildRoles,
  formatGuildRole,
  isGuildRole,
} from "@repo/auth/permissions"
import type {
  GuildMemberJoinedEvent,
  PresenceUserUpdate,
} from "@repo/realtime-types"
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Skeleton } from "@repo/ui/components/skeleton"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { cn } from "@repo/ui/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, PanelRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/ui/user-avatar"
import { UserProfilePopover } from "@/components/ui/user-profile-card"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"
import type {
  GuildMemberPresence,
  ListGuildMembersResponse,
} from "@/lib/api-types"
import { canKickGuildMembers, canManageGuildMember } from "@/lib/permissions"
import { useRightSidebar } from "./right-sidebar-context"
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
  if (!role || !isGuildRole(role)) return "Member"
  return formatGuildRole(role)
}

type ModerationDialogState = {
  type: "kick"
  member: GuildMemberPresence
} | null

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
  currentMember,
  ownerId,
  onRoleChange,
  onKick,
  isBusy,
}: {
  member: GuildMemberPresence
  currentUserId: string | null
  currentMember: { userId: string; role: string } | null
  ownerId: string | null
  onRoleChange: (member: GuildMemberPresence, role: AssignableGuildRole) => void
  onKick: (member: GuildMemberPresence) => void
  isBusy: boolean
}) {
  const targetRole = isGuildRole(member.role) ? member.role : null
  const guildCtx = ownerId ? { ownerId } : null

  const canManageTarget =
    currentMember && guildCtx && currentUserId !== member.userId
      ? canManageGuildMember(
          currentMember,
          { userId: member.userId, role: member.role },
          guildCtx
        )
      : false

  const canUpdateRole = canManageTarget && !!targetRole
  const canKick =
    currentMember && guildCtx
      ? canKickGuildMembers(currentMember, guildCtx) && canManageTarget
      : false

  const showActions = canUpdateRole || canKick

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-foreground/[0.04]">
      <UserProfilePopover userId={member.userId} side="left" align="start">
        <button type="button" className="relative shrink-0 cursor-pointer">
          <UserAvatar name={member.name} src={member.image} size="sm" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-card",
              statusStyles[member.status]
            )}
          />
        </button>
      </UserProfilePopover>
      <div className="min-w-0 flex-1">
        <UserProfilePopover userId={member.userId} side="left" align="start">
          <button
            type="button"
            className="cursor-pointer truncate text-[13px] font-medium hover:underline"
          >
            {member.name}
          </button>
        </UserProfilePopover>
        <div className="truncate text-[11px] text-muted-foreground">
          {member.isOwner ? "Owner" : formatRole(member.role)}
        </div>
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
              {canKick && (
                <DropdownMenuItem onClick={() => onKick(member)}>
                  Kick member
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
  const { toggleCollapsed, clearView } = useRightSidebar()
  const isMobile = useIsMobile()
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
  const {
    data: activeMember,
    error: activeMemberError,
    isError: hasActiveMemberError,
  } = useQuery({
    queryKey: ["active-guild-member", view.guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMember()
      if (res.error) {
        throw new Error(
          res.error.message ?? "Failed to verify moderation permissions"
        )
      }

      if (!res.data) {
        throw new Error("Failed to verify moderation permissions")
      }

      return res.data
    },
    enabled: !!view.guildSlug,
  })
  const guildId = data?.guildId
  const currentUserId = session?.user?.id ?? null
  const activeMemberRole =
    typeof activeMember?.role === "string" ? activeMember.role : null
  const currentMember =
    !hasActiveMemberError && currentUserId && activeMemberRole
      ? { userId: currentUserId, role: activeMemberRole }
      : null
  const ownerId = data?.ownerId ?? null

  useEffect(() => {
    if (!hasActiveMemberError) return

    toast.error(
      activeMemberError instanceof Error
        ? activeMemberError.message
        : "Failed to verify moderation permissions"
    )
  }, [hasActiveMemberError, activeMemberError, view.guildSlug])

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

  const isMutating = updateRoleMutation.isPending || kickMutation.isPending

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

  const handleConfirmModeration = () => {
    if (!moderationDialog) return

    if (moderationDialog.type === "kick") {
      kickMutation.mutate(moderationDialog.member.userId)
    }
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

    const onMemberJoined = (payload: GuildMemberJoinedEvent) => {
      if (!guildId || payload.guildId !== guildId) return
      // Refetch the full member list to get the new member with all fields
      queryClient.invalidateQueries({ queryKey })
    }

    socket.on("presence:ready", onPresenceReady)
    socket.on("connect", onConnect)
    socket.on("presence:user:update", onPresenceUpdate)
    socket.on("guild:member:joined", onMemberJoined)

    if (socket.connected) {
      requestSnapshot()
    }

    return () => {
      socket.off("presence:ready", onPresenceReady)
      socket.off("connect", onConnect)
      socket.off("presence:user:update", onPresenceUpdate)
      socket.off("guild:member:joined", onMemberJoined)
    }
  }, [socket, guildId, queryClient, queryKey])

  const members = data?.members ?? []
  const onlineMembers = members.filter((member) => member.status !== "offline")
  const offlineMembers = members.filter((member) => member.status === "offline")
  const isModerationDialogOpen = moderationDialog !== null
  const moderationDialogTitle = "Kick member"
  const moderationDialogDescription = moderationDialog
    ? `Are you sure you want to kick ${moderationDialog.member.name} from this guild? They can rejoin if invited again.`
    : ""
  const isModerationSubmitting =
    moderationDialog?.type === "kick" && kickMutation.isPending
  const moderationActionLabel = "Kick member"

  return (
    <>
      <div className="flex h-full w-full flex-col bg-card">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-sm text-muted-foreground">
            {members.length} members
          </span>
          <button
            type="button"
            onClick={isMobile ? clearView : toggleCollapsed}
            className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelRight className="size-4" />
          </button>
        </div>

        {hasActiveMemberError && (
          <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
            Unable to verify moderation permissions right now. Moderation
            actions are temporarily unavailable.
          </div>
        )}

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
                          currentMember={currentMember}
                          ownerId={ownerId}
                          onRoleChange={handleRoleChange}
                          onKick={handleKick}
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
                          currentMember={currentMember}
                          ownerId={ownerId}
                          onRoleChange={handleRoleChange}
                          onKick={handleKick}
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
          if (!open && isModerationSubmitting) {
            return
          }

          if (!open) {
            setModerationDialog(null)
          }
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (isModerationSubmitting) {
              event.preventDefault()
            }
          }}
        >
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
              onClick={(event) => {
                event.preventDefault()
                handleConfirmModeration()
              }}
            >
              {moderationActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
