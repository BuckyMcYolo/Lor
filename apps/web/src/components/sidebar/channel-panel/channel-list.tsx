import { cn } from "@repo/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import {
  ChevronDown,
  Hash,
  Megaphone,
  MessageSquare,
  Volume2,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"

const channelIcons = {
  text: Hash,
  voice: Volume2,
  announcement: Megaphone,
  forum: MessageSquare,
} as const

function ChannelIcon({ type }: { type: string }) {
  const Icon = channelIcons[type as keyof typeof channelIcons] ?? Hash
  return <Icon className="size-4 shrink-0 opacity-50" />
}

export function ChannelList() {
  const { guildSlug } = useParams({ strict: false })

  const { data } = useQuery({
    queryKey: ["channels", guildSlug],
    queryFn: async () => {
      const res = await apiClient.v1.channels.$get()
      if (!res.ok) {
        throw new Error("Failed to fetch channels")
      }
      const json = await res.json()
      return json.data
    },
    enabled: !!guildSlug,
  })

  if (!data) {
    return null
  }

  const isEmpty =
    data.uncategorized.length === 0 && data.categories.length === 0

  if (isEmpty) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
        <p>No channels yet.</p>
        <p>Create one to get started.</p>
      </div>
    )
  }

  return (
    <nav className="space-y-4">
      {/* Uncategorized channels */}
      {data.uncategorized.length > 0 && (
        <div>
          {data.uncategorized.map((ch) => (
            <ChannelItem key={ch.id} name={ch.name ?? ""} type={ch.type} />
          ))}
        </div>
      )}

      {/* Categories with children */}
      {data.categories.map((cat) => (
        <div key={cat.id}>
          <button
            type="button"
            className="flex w-full items-center gap-0.5 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="size-3 shrink-0" />
            <span className="truncate">{cat.name}</span>
          </button>
          {cat.channels.map((ch) => (
            <ChannelItem key={ch.id} name={ch.name ?? ""} type={ch.type} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function ChannelItem({
  name,
  type,
  active = false,
}: {
  name: string
  type: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full items-center gap-2 rounded-lg px-2 py-[6px] text-[14px] hover:bg-foreground/[0.06]",
        active
          ? "bg-foreground/[0.06] font-medium text-foreground"
          : "text-muted-foreground"
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <ChannelIcon type={type} />
      <span className="truncate">{name}</span>
    </button>
  )
}
