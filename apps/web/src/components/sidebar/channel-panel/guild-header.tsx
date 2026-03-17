import { authClient } from "@repo/auth/client"
import { isGuildRole } from "@repo/auth/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ChevronDown, Link, UserPlus } from "lucide-react"
import { useMemo, useState } from "react"
import { CreateInviteDialog } from "@/components/invite/create-invite-dialog"
import { ManageInvitesDialog } from "@/components/invite/manage-invites-dialog"
import { canKickGuildMembers } from "@/lib/permissions"

export function GuildHeader() {
  const { guildSlug } = useParams({ strict: false })
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [manageInvitesOpen, setManageInvitesOpen] = useState(false)

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
    queryFn: async () => {
      const res = await authClient.organization.getActiveMember()
      if (res.error) {
        if (res.error.status === 403) return null
        throw res.error
      }
      return res.data
    },
    enabled: !!guildSlug,
  })

  const canManageInvites =
    typeof activeMember?.role === "string" &&
    isGuildRole(activeMember.role) &&
    canKickGuildMembers(activeMember.role)

  const guildName = useMemo(
    () => guilds?.find((g) => g.slug === guildSlug)?.name,
    [guilds, guildSlug]
  )

  const title = isPending ? "Loading..." : (guildName ?? "Guild not found")

  if (!canManageInvites) {
    return (
      <div className="flex h-[49px] w-full items-center border-b border-border px-4">
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
            className="flex h-[49px] w-full items-center justify-between border-b border-border px-4 hover:bg-foreground/5"
          >
            <h2 className="truncate text-[15px] font-bold tracking-tight">
              {title}
            </h2>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 size-4" />
            Invite People
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setManageInvitesOpen(true)}>
            <Link className="mr-2 size-4" />
            Manage Invites
          </DropdownMenuItem>
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
    </>
  )
}
