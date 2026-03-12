import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"

export const Route = createFileRoute("/_authenticated/$guildSlug")({
  component: GuildLayout,
})

function GuildLayout() {
  const { guildSlug } = Route.useParams()
  const [isSwitchingGuild, setIsSwitchingGuild] = useState(false)
  const latestDesiredGuildRef = useRef<string | null>(null)
  const switchRequestRef = useRef(0)

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
    let cancelled = false

    if (!guild) {
      latestDesiredGuildRef.current = null
      setIsSwitchingGuild(false)
      return
    }

    const desiredGuildId = guild.id
    latestDesiredGuildRef.current = desiredGuildId

    if (activeOrg?.id === desiredGuildId) {
      setIsSwitchingGuild(false)
      return
    }

    const requestId = ++switchRequestRef.current
    setIsSwitchingGuild(true)

    void (async () => {
      try {
        await authClient.organization.setActive({
          organizationId: desiredGuildId,
        })

        if (
          cancelled ||
          latestDesiredGuildRef.current !== desiredGuildId ||
          switchRequestRef.current !== requestId
        ) {
          return
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["active-guild", guildSlug],
          }),
          queryClient.invalidateQueries({
            queryKey: ["active-guild-member", guildSlug],
          }),
        ])
      } finally {
        if (
          !cancelled &&
          latestDesiredGuildRef.current === desiredGuildId &&
          switchRequestRef.current === requestId
        ) {
          setIsSwitchingGuild(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
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

  if (isSwitchingGuild || activeOrg?.id !== guild.id) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return <Outlet />
}
