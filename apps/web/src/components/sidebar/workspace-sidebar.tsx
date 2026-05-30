"use client"

import { BubbleChatIcon, FolderAddIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { authClient } from "@repo/auth/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { Hash, Plus } from "lucide-react"
import { useEffect, useMemo } from "react"
import { ChannelList } from "./channel-panel/channel-list"
import {
  CreateChannelProvider,
  useCreateChannel,
} from "./channel-panel/create-channel-context"
import { UserBar } from "./channel-panel/user-bar"
import { WorkspaceCommand } from "./channel-panel/workspace-command"

const LAST_WORKSPACE_KEY = "lor:last-workspace-slug"

export function WorkspaceSidebar() {
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

  const { data: workspaces, isPending } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      if (res.error) throw res.error
      return res.data
    },
  })

  const activeWorkspace = useMemo(
    () => workspaces?.find((w) => w.slug === workspaceSlug) ?? workspaces?.[0],
    [workspaces, workspaceSlug]
  )

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
    <Sidebar variant="inset">
      <SidebarHeader className="gap-1 p-0 pb-1">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
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
              <div className="flex flex-1 items-center text-left text-sm leading-tight">
                {isPending ? (
                  <Skeleton className="h-3.5 w-24 rounded" />
                ) : (
                  <span className="truncate font-semibold">
                    {activeWorkspace?.name ?? "Lor"}
                  </span>
                )}
              </div>
            </SidebarMenuButton>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Direct messages"
                  onClick={() => {
                    void navigate({ to: "/dms" })
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={BubbleChatIcon}
                    size={18}
                    strokeWidth={2}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>Direct messages</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex min-w-0 items-center gap-1.5 pt-3 pb-1">
          <div className="min-w-0 flex-1">
            <WorkspaceCommand />
          </div>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger
                  aria-label="Create"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground hover:bg-foreground/[0.04] data-[state=open]:text-foreground data-[state=open]:bg-foreground/[0.04]"
                >
                  <Plus className="size-4" />
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
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1 pt-1">
          <div className="-mx-2 min-h-0 flex-1 overflow-hidden">
            <ChannelList />
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserBar />
      </SidebarFooter>
    </Sidebar>
  )
}
