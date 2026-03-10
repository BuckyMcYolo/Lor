import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"

export const Route = createFileRoute("/_authenticated/$guildSlug")({
  component: GuildLayout,
})

function GuildLayout() {
  const { guildSlug } = Route.useParams()

  const { data: guilds, isPending: guildsLoading } = useQuery({
    queryKey: ["guilds"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      return res.data
    },
  })
  const { data: activeOrg } = useQuery({
    queryKey: ["active-guild", guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getFullOrganization()
      return res.data
    },
  })

  const guild = useMemo(
    () => guilds?.find((g) => g.slug === guildSlug),
    [guilds, guildSlug]
  )

  const queryClient = useQueryClient()

  useEffect(() => {
    if (!guild) return
    if (activeOrg?.id === guild.id) return
    authClient.organization.setActive({ organizationId: guild.id }).then(() => {
      queryClient.invalidateQueries({
        queryKey: ["active-guild-member", guildSlug],
      })
    })
  }, [guild, activeOrg?.id, guildSlug, queryClient])

  if (guildsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!guild) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Guild not found</span>
      </div>
    )
  }

  return <Outlet />
}
