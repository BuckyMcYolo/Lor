import { authClient } from "@repo/auth/client"
import { cn } from "@repo/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { MessageCircle, Plus } from "lucide-react"
import { useState } from "react"
import { CreateWorkspaceDialog } from "./create-workspace-dialog"

function WorkspaceIcon({
  name,
  logo,
  active,
  onClick,
}: {
  name: string
  logo: string | null | undefined
  active: boolean
  onClick: () => void
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-center justify-center px-3 py-1"
    >
      {/* Left pill indicator */}
      <div
        className={cn(
          "absolute left-0 w-1 rounded-r-full bg-foreground transition-all",
          active ? "h-10" : "h-0 group-hover:h-5"
        )}
      />

      <div
        className={cn(
          "flex size-12 items-center justify-center overflow-hidden text-[15px] font-semibold transition-all",
          logo
            ? active
              ? "rounded-2xl"
              : "rounded-[24px] hover:rounded-2xl"
            : active
              ? "rounded-2xl bg-primary text-primary-foreground"
              : "rounded-[24px] bg-muted text-muted-foreground hover:rounded-2xl hover:bg-primary hover:text-primary-foreground"
        )}
      >
        {logo ? (
          <img src={logo} alt={name} className="size-full object-cover" />
        ) : (
          initials
        )}
      </div>
    </button>
  )
}

export function WorkspaceBar() {
  const navigate = useNavigate()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { workspaceSlug } = useParams({ strict: false })

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      return res.data
    },
  })
  return (
    <div className="flex h-full w-[72px] shrink-0 flex-col items-center bg-background py-3">
      {/* Home / DMs button */}
      <button
        type="button"
        onClick={() => navigate({ to: "/dms" })}
        className="group relative flex shrink-0 items-center justify-center px-3 py-1"
      >
        <div
          className={cn(
            "absolute left-0 w-1 rounded-r-full bg-foreground transition-all",
            !workspaceSlug ? "h-10" : "h-0 group-hover:h-5"
          )}
        />
        <div
          className={cn(
            "flex size-12 items-center justify-center overflow-hidden transition-all",
            !workspaceSlug
              ? "rounded-2xl bg-primary text-primary-foreground"
              : "rounded-[24px] bg-muted text-muted-foreground hover:rounded-2xl hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <MessageCircle className="size-6" />
        </div>
      </button>

      {/* Separator */}
      <div className="mx-auto my-1 h-px w-8 shrink-0 rounded-full bg-border" />

      {/* Workspace icons */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((workspace) => (
            <WorkspaceIcon
              key={workspace.id}
              name={workspace.name}
              logo={workspace.logo}
              active={workspaceSlug === workspace.slug}
              onClick={() =>
                navigate({
                  to: "/$workspaceSlug",
                  params: { workspaceSlug: workspace.slug },
                })
              }
            />
          ))
        ) : (
          <div className="flex size-12 items-center justify-center rounded-[24px] bg-muted text-muted-foreground text-xs">
            —
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="mx-auto my-1 h-px w-8 shrink-0 rounded-full bg-border" />

      {/* Add workspace button */}
      <button
        type="button"
        onClick={() => setCreateDialogOpen(true)}
        className="group relative flex shrink-0 items-center justify-center px-3 py-1"
      >
        <div className="flex size-12 items-center justify-center rounded-[24px] bg-muted text-emerald-500 transition-all hover:rounded-2xl hover:bg-emerald-500 hover:text-white">
          <Plus className="size-6" />
        </div>
      </button>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
