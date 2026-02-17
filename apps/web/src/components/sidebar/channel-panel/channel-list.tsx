import { Skeleton } from "@repo/ui/components/skeleton"
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
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
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

function ChannelListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-2 px-2 py-[6px]">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center gap-0.5 px-1 pb-1">
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-2 px-2 py-[6px]">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChannelList() {
  const { guildSlug } = useParams({ strict: false })

  const { data, isPending } = useQuery({
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

  if (isPending) {
    return <ChannelListSkeleton />
  }

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
        <CategorySection key={cat.id} name={cat.name ?? ""}>
          {cat.channels.map((ch) => (
            <ChannelItem key={ch.id} name={ch.name ?? ""} type={ch.type} />
          ))}
        </CategorySection>
      ))}
    </nav>
  )
}

function CategorySection({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-0.5 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <motion.div
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <ChevronDown className="size-3 shrink-0" />
        </motion.div>
        <span className="truncate">{name}</span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
