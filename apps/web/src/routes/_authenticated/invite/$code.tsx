import { Button } from "@repo/ui/components/button"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Shield, Users } from "lucide-react"
import { toast } from "sonner"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/_authenticated/invite/$code")({
  component: InvitePage,
})

function InvitePage() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const socket = useSocket()
  const queryClient = useQueryClient()

  const {
    data: preview,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: async () => {
      const res = await apiClient.v1.invites[":code"].$get({
        param: { code },
      })
      if (!res.ok) {
        throw new Error("Invite not found")
      }
      return res.json()
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.invites[":code"].accept.$post({
        param: { code },
      })
      if (!res.ok) {
        const body = await res.text()
        let message = "Failed to join guild"
        try {
          const parsed = JSON.parse(body) as { message?: string }
          if (typeof parsed.message === "string") message = parsed.message
        } catch {
          // use default
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: (data) => {
      if (socket?.connected) {
        socket.emit("guild:member:joined", { guildId: data.guild.id })
      }
      queryClient.invalidateQueries({ queryKey: ["guilds"] })
      toast.success(`Joined ${data.guild.name}!`)
      navigate({ to: "/$guildSlug", params: { guildSlug: data.guild.slug } })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to join guild"
      )
    },
  })

  function goHome() {
    navigate({ to: "/" })
  }

  // Error / expired states
  let errorContent: { title: string; description: string } | null = null

  if (!isPending && (isError || !preview)) {
    errorContent = {
      title: "Invalid Invite",
      description: "This invite link is invalid or has expired.",
    }
  } else if (!isPending && preview?.invite.isExpired) {
    errorContent = {
      title: "Invite Expired",
      description: "This invite link has expired or reached its maximum uses.",
    }
  }

  if (errorContent) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: backdrop overlay for dismiss on click
      <div
        role="button"
        tabIndex={0}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={goHome}
        onKeyDown={(e) => e.key === "Escape" && goHome()}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stop click propagation to backdrop */}
        <div
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Shield className="size-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{errorContent.title}</h2>
          <p className="text-sm text-muted-foreground">
            {errorContent.description}
          </p>
          <Button variant="outline" onClick={goHome}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const invite = preview?.invite

  return (
    // biome-ignore lint/a11y/useSemanticElements: backdrop overlay for dismiss on click
    <div
      role="button"
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={goHome}
      onKeyDown={(e) => e.key === "Escape" && goHome()}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop click propagation to backdrop */}
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isPending ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading invite...
          </div>
        ) : invite ? (
          <div className="flex flex-col items-center gap-4 text-center">
            {invite.guild.logo ? (
              <img
                src={invite.guild.logo}
                alt={invite.guild.name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {invite.guild.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold">{invite.guild.name}</h2>
              <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Users className="size-3.5" />
                {invite.guild.memberCount}{" "}
                {invite.guild.memberCount === 1 ? "member" : "members"}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {invite.inviter.name}
              </span>{" "}
              invited you to join
            </p>

            {invite.isMember ? (
              <Button
                className="w-full"
                onClick={() =>
                  navigate({
                    to: "/$guildSlug",
                    params: { guildSlug: invite.guild.slug },
                  })
                }
              >
                Already a Member — Go to Guild
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? "Joining..." : "Accept Invite"}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
