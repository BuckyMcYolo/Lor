import { authClient } from "@repo/auth/client"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { useMemo } from "react"

export function GuildHeader() {
  const { guildSlug } = useParams({ strict: false })

  const { data: guilds } = useQuery({
    queryKey: ["guilds"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      return res.data
    },
  })

  const guildName = useMemo(
    () => guilds?.find((g) => g.slug === guildSlug)?.name,
    [guilds, guildSlug]
  )

  return (
    <button
      type="button"
      className="flex h-[49px] w-full items-center justify-between border-b border-border px-4 hover:bg-foreground/5"
    >
      <h2 className="truncate text-[15px] font-bold tracking-tight">
        {guildName ?? "Loading..."}
      </h2>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
