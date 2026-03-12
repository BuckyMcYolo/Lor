import { authClient } from "@repo/auth/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/$guildSlug")({
  component: GuildLayout,
})

function GuildLayout() {
  const { guildSlug } = Route.useParams()
  const [isSwitchingGuild, setIsSwitchingGuild] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
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
    queryKey: ["active-guild"],
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
      setSwitchError(null)
      setIsSwitchingGuild(false)
      return
    }

    const desiredGuildId = guild.id
    latestDesiredGuildRef.current = desiredGuildId

    if (activeOrg?.id === desiredGuildId) {
      setSwitchError(null)
      setIsSwitchingGuild(false)
      return
    }

    const requestId = ++switchRequestRef.current
    setSwitchError(null)
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
            queryKey: ["active-guild"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["active-guild-member", guildSlug],
          }),
        ])
      } catch (error) {
        if (
          cancelled ||
          latestDesiredGuildRef.current !== desiredGuildId ||
          switchRequestRef.current !== requestId
        ) {
          return
        }

        console.error("[guild-layout] Failed to switch active guild", error)
        const message = "Failed to switch guild. Please try again."
        setSwitchError(message)
        toast.error(message)
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

  if (isSwitchingGuild) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (activeOrg?.id !== guild.id) {
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
