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
import { CreateInviteDialog } from "@/components/invite/create-invite-dialog"
import { ManageInvitesDialog } from "@/components/invite/manage-invites-dialog"
import { WorkspaceSettingsDialog } from "@/components/workspace/workspace-settings-dialog"
import { canKickWorkspaceMembers, isAdminOrOwner } from "@/lib/permissions"

export function WorkspaceHeader() {
  const { workspaceSlug } = useParams({ strict: false })
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [manageInvitesOpen, setManageInvitesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: workspaces, isPending } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      if (res.error) throw res.error
      return res.data
    },
  })

  const { data: activeMember } = useQuery({
    queryKey: ["active-workspace-member", workspaceSlug],
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
    enabled: !!workspaceSlug,
  })

  const activeWorkspace = useMemo(
    () => workspaces?.find((g) => g.slug === workspaceSlug) ?? null,
    [workspaces, workspaceSlug]
  )

  const permissionCtx =
    activeMember && activeWorkspace?.ownerId
      ? {
          actor: activeMember,
          workspace: { ownerId: activeWorkspace.ownerId },
        }
      : null

  const canManageInvites = permissionCtx
    ? canKickWorkspaceMembers(permissionCtx.actor, permissionCtx.workspace)
    : false
  const canEditWorkspace = permissionCtx
    ? isAdminOrOwner(permissionCtx.actor, permissionCtx.workspace)
    : false

  const workspaceName = activeWorkspace?.name

  const title = isPending
    ? "Loading..."
    : (workspaceName ?? "Workspace not found")

  const showDropdown = canManageInvites || canEditWorkspace

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
          {canEditWorkspace && (
            <>
              {canManageInvites && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 size-4" />
                Workspace Settings
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
      {canEditWorkspace && activeWorkspace && (
        <WorkspaceSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workspace={activeWorkspace}
        />
      )}
    </>
  )
}
