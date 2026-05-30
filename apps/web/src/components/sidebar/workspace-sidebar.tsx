"use client"

import { BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { authClient } from "@repo/auth/client"
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
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { ChannelList } from "./channel-panel/channel-list"
import { SearchBar } from "./channel-panel/search-bar"
import { UserBar } from "./channel-panel/user-bar"

const LAST_WORKSPACE_KEY = "lor:last-workspace-slug"

export function WorkspaceSidebar() {
  const { workspaceSlug } = useParams({ strict: false })
  const navigate = useNavigate()

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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-1">
              <SidebarMenuButton
                size="lg"
                className="flex-1 data-[state=open]:bg-sidebar-accent"
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
                <div className="grid flex-1 text-left text-sm leading-tight">
                  {isPending ? (
                    <Skeleton className="h-3.5 w-24 rounded" />
                  ) : (
                    <span className="truncate font-semibold">
                      {activeWorkspace?.name ?? "Lor"}
                    </span>
                  )}
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Workspace
                  </span>
                </div>
              </SidebarMenuButton>

              {/* Mode pivot — jump to DMs (user-scoped) */}
              <button
                type="button"
                aria-label="Direct messages"
                title="Direct messages"
                onClick={() => {
                  void navigate({ to: "/dms" })
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <HugeiconsIcon
                  icon={BubbleChatIcon}
                  size={18}
                  strokeWidth={2}
                />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pb-1">
          <SearchBar mode="workspace" />
        </SidebarGroup>

        <SidebarGroup className="min-h-0 flex-1">
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
