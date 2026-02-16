import { Search } from "lucide-react"

export function SearchBar() {
  return (
    <div className="px-3 pt-3 pb-1">
      <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[13px] text-muted-foreground">
        <Search className="size-3.5 shrink-0" />
        <span>Search</span>
      </div>
    </div>
  )
}
