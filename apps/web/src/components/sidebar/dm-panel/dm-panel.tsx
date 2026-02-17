import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Plus } from "lucide-react"
import { SearchBar } from "../channel-panel/search-bar"
import { UserBar } from "../channel-panel/user-bar"
import { DMList } from "./dm-list"

export function DMPanel() {
  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex h-[49px] items-center justify-between border-b border-border px-4">
        <h2 className="text-[15px] font-bold tracking-tight">
          Direct Messages
        </h2>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <SearchBar />
      <ScrollArea className="flex-1 px-3 pt-3">
        <DMList />
      </ScrollArea>
      <UserBar />
    </div>
  )
}
