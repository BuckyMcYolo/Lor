import { ChevronDown } from "lucide-react"

export function GuildHeader() {
  return (
    <button
      type="button"
      className="flex h-[49px] w-full items-center justify-between border-b border-border px-4 hover:bg-foreground/5"
    >
      <h2 className="truncate text-[15px] font-bold tracking-tight">
        Townhall
      </h2>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
