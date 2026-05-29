import { authClient } from "@repo/auth/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ChevronDown, Link, Settings, UserPlus } from "lucide-react"
import { useMemo, useState } from "react"
import { GuildSettingsDialog } from "@/components/guild/guild-settings-dialog"
import { CreateInviteDialog } from "@/components/invite/create-invite-dialog"
import { ManageInvitesDialog } from "@/components/invite/manage-invites-dialog"
import { canKickGuildMembers, isAdminOrOwner } from "@/lib/permissions"

export function GuildHeader() {
  const { guildSlug } = useParams({ strict: false })
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [manageInvitesOpen, setManageInvitesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: guilds, isPending } = useQuery({
    queryKey: ["guilds"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      if (res.error) throw res.error
      return res.data
    },
  })

  const { data: activeMember } = useQuery({
    queryKey: ["active-guild-member", guildSlug],
    queryFn: async (): Promise<{ userId: string; role: string } | null> => {
      const res = await authClient.organization.getActiveMember()
      if (res.error) {
        if (res.error.status === 403) return null
        throw res.error
      }
      return res.data
        ? {
            userId: res.data.userId as string,
            role: res.data.role as string,
          }
        : null
    },
    enabled: !!guildSlug,
  })

  const activeGuild = useMemo(
    () => guilds?.find((g) => g.slug === guildSlug) ?? null,
    [guilds, guildSlug]
  )

  const permissionCtx =
    activeMember && activeGuild?.ownerId
      ? {
          actor: activeMember,
          guild: { ownerId: activeGuild.ownerId },
        }
      : null

  const canManageInvites = permissionCtx
    ? canKickGuildMembers(permissionCtx.actor, permissionCtx.guild)
    : false
  const canEditGuild = permissionCtx
    ? isAdminOrOwner(permissionCtx.actor, permissionCtx.guild)
    : false

  const guildName = activeGuild?.name

  const title = isPending ? "Loading..." : (guildName ?? "Guild not found")

  const showDropdown = canManageInvites || canEditGuild

  if (!showDropdown) {
    return (
      <div className="flex h-[49px] shrink-0 w-full items-center border-b border-border px-4">
        <h2 className="truncate text-[15px] font-bold tracking-tight">
          {title}
        </h2>
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-[49px] shrink-0 w-full items-center justify-between border-b border-border px-4 hover:bg-foreground/5"
          >
            <h2 className="truncate text-[15px] font-bold tracking-tight">
              {title}
            </h2>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {canManageInvites && (
            <>
              <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 size-4" />
                Invite People
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManageInvitesOpen(true)}>
                <Link className="mr-2 size-4" />
                Manage Invites
              </DropdownMenuItem>
            </>
          )}
          {canEditGuild && (
            <>
              {canManageInvites && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 size-4" />
                Guild Settings
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
      <ManageInvitesDialog
        open={manageInvitesOpen}
        onOpenChange={setManageInvitesOpen}
      />
      {canEditGuild && activeGuild && (
        <GuildSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          guild={activeGuild}
        />
      )}
    </>
  )
}
