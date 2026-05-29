import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/$workspaceSlug")({
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  const { workspaceSlug } = Route.useParams()
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const latestDesiredWorkspaceRef = useRef<string | null>(null)
  const switchRequestRef = useRef(0)

  const { data: workspaces, isPending: workspacesLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      return res.data
    },
  })
  const { data: activeOrg } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: async () => {
      const res = await authClient.organization.getFullOrganization()
      return res.data
    },
  })

  const workspace = useMemo(
    () => workspaces?.find((g) => g.slug === workspaceSlug),
    [workspaces, workspaceSlug]
  )

  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false

    if (!workspace) {
      latestDesiredWorkspaceRef.current = null
      setSwitchError(null)
      setIsSwitchingWorkspace(false)
      return
    }

    const desiredWorkspaceId = workspace.id
    latestDesiredWorkspaceRef.current = desiredWorkspaceId

    if (activeOrg?.id === desiredWorkspaceId) {
      setSwitchError(null)
      setIsSwitchingWorkspace(false)
      return
    }

    const requestId = ++switchRequestRef.current
    setSwitchError(null)
    setIsSwitchingWorkspace(true)

    void (async () => {
      try {
        await authClient.organization.setActive({
          organizationId: desiredWorkspaceId,
        })

        if (
          cancelled ||
          latestDesiredWorkspaceRef.current !== desiredWorkspaceId ||
          switchRequestRef.current !== requestId
        ) {
          return
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["active-workspace"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["active-workspace-member", workspaceSlug],
          }),
        ])
      } catch (error) {
        if (
          cancelled ||
          latestDesiredWorkspaceRef.current !== desiredWorkspaceId ||
          switchRequestRef.current !== requestId
        ) {
          return
        }

        console.error(
          "[workspace-layout] Failed to switch active workspace",
          error
        )
        const message = "Failed to switch workspace. Please try again."
        setSwitchError(message)
        toast.error(message)
      } finally {
        if (
          !cancelled &&
          latestDesiredWorkspaceRef.current === desiredWorkspaceId &&
          switchRequestRef.current === requestId
        ) {
          setIsSwitchingWorkspace(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workspace, activeOrg?.id, workspaceSlug, queryClient])

  if (workspacesLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          Workspace not found
        </span>
      </div>
    )
  }

  if (isSwitchingWorkspace) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (activeOrg?.id !== workspace.id) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          {switchError ?? "Loading..."}
        </span>
      </div>
    )
  }

  return <Outlet />
}
