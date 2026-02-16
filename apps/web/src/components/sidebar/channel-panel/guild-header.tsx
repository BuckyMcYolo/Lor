import { authClient } from "@repo/auth/client"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"

export function GuildHeader() {
  const { guildSlug } = useParams({ strict: false })

  const { data: activeOrg } = useQuery({
    queryKey: ["active-guild", guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getFullOrganization()
      return res.data
    },
  })

  return (
    <button
      type="button"
      className="flex h-[49px] w-full items-center justify-between border-b border-border px-4 hover:bg-foreground/5"
    >
      <h2 className="truncate text-[15px] font-bold tracking-tight">
        {activeOrg?.name ?? "No guild selected"}
      </h2>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
