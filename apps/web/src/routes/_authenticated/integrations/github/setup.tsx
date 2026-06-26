import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

type SetupSearch = {
  installation_id?: string
  state?: string
}

// GitHub redirects here after an App install (Setup URL): it appends
// ?installation_id=…&state=<workspaceSlug>. We link the install to the
// workspace, then bounce back into it.
export const Route = createFileRoute(
  "/_authenticated/integrations/github/setup"
)({
  component: GithubSetup,
  validateSearch: (search: Record<string, unknown>): SetupSearch => {
    // GitHub sends a numeric installation id; ignore anything that isn't one.
    const raw =
      typeof search.installation_id === "string"
        ? search.installation_id
        : typeof search.installation_id === "number"
          ? String(search.installation_id)
          : undefined
    return {
      installation_id: raw && /^\d+$/.test(raw) ? raw : undefined,
      state: typeof search.state === "string" ? search.state : undefined,
    }
  },
})

function GithubSetup() {
  const { installation_id, state } = Route.useSearch()
  const navigate = useNavigate()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    void (async () => {
      if (!installation_id || !state) {
        toast.error("Missing GitHub install details")
        await navigate({ to: "/" })
        return
      }
      let connected = false
      try {
        const res = await apiClient.v1.workspaces[
          ":workspaceSlug"
        ].integrations.github.connect.$post({
          param: { workspaceSlug: state },
          json: { installationId: installation_id },
        })
        connected = res.ok
        toast[res.ok ? "success" : "error"](
          res.ok ? "GitHub connected" : "Couldn't connect GitHub"
        )
      } catch {
        toast.error("Couldn't connect GitHub")
      }
      // Only deep-link into the Integrations tab on success; on failure just
      // return to the workspace.
      await navigate({
        to: "/$workspaceSlug",
        params: { workspaceSlug: state },
        search: connected ? { settings: "workspace", tab: "integrations" } : {},
        replace: true,
      })
    })()
  }, [installation_id, state, navigate])

  return (
    <div className="flex h-full flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Connecting GitHub…
    </div>
  )
}
