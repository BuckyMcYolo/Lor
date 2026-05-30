"use client"

import { authClient } from "@repo/auth/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar"
import { Skeleton } from "@repo/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { SearchBar } from "./channel-panel/search-bar"
import { UserBar } from "./channel-panel/user-bar"
import { DMList } from "./dm-panel/dm-list"
import { NewDMDialog } from "./dm-panel/new-dm-dialog"

const LAST_WORKSPACE_KEY = "lor:last-workspace-slug"

function readLastWorkspace(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(LAST_WORKSPACE_KEY)
  } catch {
    return null
  }
}

function useReturnWorkspace() {
  const { data: workspaces, isPending } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      if (res.error) throw res.error
      return res.data
    },
  })

  return useMemo(() => {
    const stored = readLastWorkspace()
    if (stored && workspaces?.some((w) => w.slug === stored)) {
      const target = workspaces.find((w) => w.slug === stored)
      return {
        slug: target?.slug ?? null,
        name: target?.name ?? null,
        logo: target?.logo ?? null,
        isPending,
      }
    }
    const fallback = workspaces?.[0]
    return {
      slug: fallback?.slug ?? null,
      name: fallback?.name ?? null,
      logo: fallback?.logo ?? null,
      isPending,
    }
  }, [workspaces, isPending])
}

export function DMSidebar() {
  const navigate = useNavigate()
  const [newDMOpen, setNewDMOpen] = useState(false)
  const { slug, name, logo, isPending } = useReturnWorkspace()

  const initial = (name ?? "L").charAt(0).toUpperCase()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              disabled={!slug}
              onClick={() => {
                if (!slug) return
                void navigate({
                  to: "/$workspaceSlug",
                  params: { workspaceSlug: slug },
                })
              }}
              tooltip={name ? `Back to ${name}` : "Direct messages"}
              className="group"
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                {logo ? (
                  <img src={logo} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                {isPending ? (
                  <Skeleton className="h-3.5 w-24 rounded" />
                ) : (
                  <span className="truncate font-semibold">
                    {name ?? "Direct messages"}
                  </span>
                )}
                <span className="flex items-center gap-1 truncate text-xs text-sidebar-foreground/70">
                  <ArrowLeft
                    className="size-3 transition-transform group-hover:-translate-x-0.5"
                    strokeWidth={2.25}
                  />
                  Back to workspace
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pb-1">
          <SearchBar mode="dm" />
        </SidebarGroup>

        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            <span>Direct Messages</span>
            <button
              type="button"
              aria-label="New direct message"
              title="New direct message"
              onClick={() => setNewDMOpen(true)}
              className="flex size-5 items-center justify-center rounded text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Plus className="size-3.5" strokeWidth={2.25} />
            </button>
          </SidebarGroupLabel>
          <div className="-mx-2 min-h-0 flex-1 overflow-hidden px-2">
            <DMList />
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserBar />
      </SidebarFooter>

      <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} />
    </Sidebar>
  )
}
