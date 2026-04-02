import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Separator } from "@repo/ui/components/separator"
import { cn } from "@repo/ui/lib/utils"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Plus, Users } from "lucide-react"
import { useState } from "react"
import { useMobileSidebar } from "@/context/mobile-sidebar-context"
import { SearchBar } from "../channel-panel/search-bar"
import { UserBar } from "../channel-panel/user-bar"
import { DMList } from "./dm-list"
import { NewDMDialog } from "./new-dm-dialog"

export function DMPanel() {
  const navigate = useNavigate()
  const { dmId } = useParams({ strict: false })
  const { setOpen: closeMobileSidebar } = useMobileSidebar()
  const [newDMOpen, setNewDMOpen] = useState(false)

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <SearchBar mode="dm" />
      <div className="space-y-0.5 px-2 pt-3">
        <button
          type="button"
          onClick={() => {
            navigate({ to: "/dms" })
            closeMobileSidebar(false)
          }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14px] font-medium hover:bg-foreground/[0.06]",
            !dmId
              ? "bg-foreground/[0.06] text-foreground"
              : "text-muted-foreground"
          )}
        >
          <Users className="size-4 shrink-0" />
          Allies
        </button>
      </div>
      <Separator className="mx-2 mt-3 w-auto" />
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
