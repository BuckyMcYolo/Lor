"use client"

import { FolderAddIcon, Message01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar"
import { Skeleton } from "@repo/ui/components/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  Check,
  ChevronsUpDown,
  Hash,
  Plus,
  PlusCircle,
  Repeat,
  Settings,
  UserPlus,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { CreateInviteDialog } from "@/components/invite/create-invite-dialog"
import { WorkspaceSettingsDialog } from "@/components/workspace/workspace-settings-dialog"
import { apiClient } from "@/lib/api-client"
import { canCreateChannels } from "@/lib/permissions"
import { ChannelList } from "./channel-panel/channel-list"
import {
  CreateChannelProvider,
  useCreateChannel,
} from "./channel-panel/create-channel-context"
import { WorkspaceCommand } from "./channel-panel/workspace-command"
import { CreateWorkspaceDialog } from "./create-workspace-dialog"

const LAST_WORKSPACE_KEY = "lor:last-workspace-slug"

/**
 * Full standalone workspace sidebar (Sidebar shell + content). Kept for
 * any caller that wants a self-contained sidebar.
 */
export function WorkspaceSidebar() {
  return (
    <Sidebar variant="inset">
      <WorkspaceSidebarContent />
    </Sidebar>
  )
}

/**
 * Inner content only (SidebarHeader + SidebarContent + SidebarFooter).
 * Designed to be hosted inside a Sidebar shell provided by the caller —
 * lets `sidebar/index.tsx` host both the workspace and DM content under
 * a single Sidebar so we can animate the swap.
 */
export function WorkspaceSidebarContent() {
  return (
    <CreateChannelProvider>
      <WorkspaceSidebarInner />
    </CreateChannelProvider>
  )
}

function WorkspaceSidebarInner() {
  const { workspaceSlug } = useParams({ strict: false })
  const navigate = useNavigate()
  const { openCreateChannel, openCreateCategory } = useCreateChannel()
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: workspaces, isPending } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      if (res.error) throw res.error
      return res.data
    },
  })

  const activeWorkspace = useMemo(() => {
    if (!workspaces) return undefined
    if (!workspaceSlug) return workspaces[0]
    return workspaces.find((w) => w.slug === workspaceSlug)
  }, [workspaces, workspaceSlug])

  // Permission gating for the Create dropdown. Same queries the
  // ChannelList consumes — react-query dedupes so this is free.
  const { data: activeMember } = useQuery({
    queryKey: ["active-workspace-member", workspaceSlug],
    queryFn: async (): Promise<{ userId: string; role: string } | null> => {
      const res = await authClient.organization.getActiveMember()
      return res.data
        ? {
            userId: res.data.userId as string,
            role: res.data.role as string,
          }
        : null
    },
    enabled: !!workspaceSlug,
  })

  const { data: workspaceMembersData } = useQuery({
    queryKey: ["workspace-members", workspaceSlug],
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].members.$get({
        param: { workspaceSlug: workspaceSlug as string },
      })
      if (!res.ok) throw new Error("Failed to fetch workspace members")
      return res.json()
    },
    enabled: !!workspaceSlug,
  })

  const canCreate =
    activeMember && workspaceMembersData?.ownerId
      ? canCreateChannels(activeMember, {
          ownerId: workspaceMembersData.ownerId,
        })
      : false

  // Remember the active workspace so the DM view's "back" affordance
  // can return here.
  useEffect(() => {
    if (!workspaceSlug) return
    try {
      window.localStorage.setItem(LAST_WORKSPACE_KEY, workspaceSlug)
    } catch {
      // ignore quota / private-mode failures
    }
  }, [workspaceSlug])

  const initial = (activeWorkspace?.name ?? "L").charAt(0).toUpperCase()

  return (
    <>
      <SidebarHeader className="gap-1 p-0 pb-1">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                  tooltip={activeWorkspace?.name ?? "Workspace"}
                >
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                    {activeWorkspace?.logo ? (
                      <img
                        src={activeWorkspace.logo}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center text-left text-sm leading-tight">
                    {isPending ? (
                      <Skeleton className="h-3.5 w-24 rounded" />
                    ) : (
                      <span className="truncate font-semibold">
                        {activeWorkspace?.name ?? "Lor"}
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={4}
                className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
              >
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                  {activeWorkspace?.name ?? "Workspace"}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => setSettingsOpen(true)}
                  disabled={!activeWorkspace}
                >
                  <Settings className="size-4 text-muted-foreground" />
                  Workspace settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setInviteOpen(true)}
                  disabled={!workspaceSlug}
                >
                  <UserPlus className="size-4 text-muted-foreground" />
                  Invite people
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Repeat className="size-4 text-muted-foreground" />
                    Switch workspace
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-56">
                    {workspaces?.map((ws) => {
                      const isActive = ws.slug === activeWorkspace?.slug
                      const wsInitial = (ws.name ?? "?").charAt(0).toUpperCase()
                      return (
                        <DropdownMenuItem
                          key={ws.id}
                          onSelect={() => {
                            if (isActive) return
                            void navigate({
                              to: "/$workspaceSlug",
                              params: { workspaceSlug: ws.slug },
                            })
                          }}
                        >
                          <div className="flex aspect-square size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
                            {ws.logo ? (
                              <img
                                src={ws.logo}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              wsInitial
                            )}
                          </div>
                          <span className="truncate">{ws.name}</span>
                          {isActive && (
                            <Check className="ml-auto size-4 text-muted-foreground" />
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setCreateWorkspaceOpen(true)}
                    >
                      <PlusCircle className="size-4 text-muted-foreground" />
                      Create workspace
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Direct messages"
                  onClick={() => {
                    void navigate({ to: "/dms" })
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={Message01Icon}
                    size={18}
                    strokeWidth={2}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Direct messages</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex min-w-0 items-center gap-1.5 pt-3 pb-1">
          <div className="min-w-0 flex-1">
            <WorkspaceCommand />
          </div>
          {canCreate && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Create"
                      className="text-muted-foreground hover:text-foreground data-[state=open]:bg-foreground/[0.04] data-[state=open]:text-foreground"
                    >
                      <Plus />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Create</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem onSelect={() => openCreateChannel()}>
                  <Hash className="size-4 mr-2" />
                  New channel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openCreateCategory}>
                  <HugeiconsIcon icon={FolderAddIcon} className="size-4 mr-2" />
                  New category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1 pt-1">
          <div className="-mx-2 min-h-0 flex-1 overflow-hidden">
            <ChannelList />
          </div>
        </SidebarGroup>
      </SidebarContent>

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
      />
      {activeWorkspace && (
        <WorkspaceSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workspace={activeWorkspace}
        />
      )}
      <CreateInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}
