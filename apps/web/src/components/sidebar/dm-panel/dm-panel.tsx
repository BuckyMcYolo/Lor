import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Plus } from "lucide-react"
import { useState } from "react"
import { SearchBar } from "../channel-panel/search-bar"
import { UserBar } from "../channel-panel/user-bar"
import { DMList } from "./dm-list"
import { NewDMDialog } from "./new-dm-dialog"

export function DMPanel() {
  const [newDMOpen, setNewDMOpen] = useState(false)

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <SearchBar mode="dm" />
      <div className="mt-3 flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Direct Messages
        </span>
        <button
          type="button"
          aria-label="New direct message"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setNewDMOpen(true)}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <ScrollArea className="flex-1 px-2">
        <DMList />
      </ScrollArea>
      <UserBar />
      <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} />
    </div>
  )
}
