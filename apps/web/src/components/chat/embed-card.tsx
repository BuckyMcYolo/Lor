import { cn } from "@repo/ui/lib/utils"
import { ExternalLink } from "lucide-react"
import type { Message } from "@/lib/api-types"

type Embed = Message["embeds"][number]

interface EmbedCardProps {
  embed: Embed
  className?: string
}

export function EmbedCard({ embed, className }: EmbedCardProps) {
  const hasMeta = Boolean(embed.title || embed.description)

  return (
    <div
      className={cn(
        "mt-1 max-w-lg overflow-hidden rounded border border-border/70 bg-[hsl(var(--card))]/60",
        "border-l-4 border-l-primary/60",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5 p-3">
        {embed.title && (
          <a
            href={embed.url}
            target="_blank"
            rel="noreferrer noopener"
            className="line-clamp-2 text-sm font-semibold text-primary hover:underline"
          >
            {embed.title}
          </a>
        )}
        {embed.description && (
          <p className="whitespace-pre-line text-[13px] leading-snug text-muted-foreground">
            {embed.description}
          </p>
        )}
        {!hasMeta && (
          <a
            href={embed.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" />
            {embed.url}
          </a>
        )}
      </div>
      {embed.thumbnail &&
        (embed.title || embed.description || embed.siteName) && (
          <div className="px-3 pb-3">
            <img
              src={embed.thumbnail}
              alt={embed.title ?? "Link preview"}
              className="w-full rounded object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
        )}
      {embed.siteName && (
        <div className="flex items-center gap-1.5 border-t border-border/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {embed.siteName}
          </span>
        </div>
      )}
    </div>
  )
}
