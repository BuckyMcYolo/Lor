import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { cn } from "@repo/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Check, Search } from "lucide-react"
import { useState } from "react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useCreateDM } from "@/hooks/use-create-dm"
import { apiClient } from "@/lib/api-client"
import type { Ally } from "@/lib/api-types"

export function NewDMDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const createDM = useCreateDM()

  const {
    data: allies,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["allies"],
    queryFn: async () => {
      const res = await apiClient.v1.allies.$get()
      if (!res.ok) throw new Error("Failed to fetch allies")
      return res.json()
    },
    enabled: open,
  })

  const filteredAllies = (allies?.allies ?? []).filter((ally) =>
    ally.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleAlly = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCreate = () => {
    if (selectedIds.size === 0) return
    createDM.mutate([...selectedIds], {
      onSuccess: () => {
        onOpenChange(false)
        setSelectedIds(new Set())
        setSearch("")
      },
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedIds(new Set())
      setSearch("")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
          <DialogDescription>
            Select allies to start a conversation with.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Search allies"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="text-xs text-muted-foreground">
            {selectedIds.size} selected
            {selectedIds.size > 1 ? " — this will create a group DM" : ""}
          </div>
        )}

        <ScrollArea className="max-h-64">
          {isPending ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading allies...
            </div>
          ) : isError ? (
            <div className="py-4 text-center text-sm text-destructive">
              Failed to load allies.
            </div>
          ) : filteredAllies.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {search
                ? "No allies match your search."
                : "You don't have any allies yet."}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredAllies.map((ally) => (
                <AllySelectRow
                  key={ally.id}
                  ally={ally}
                  selected={selectedIds.has(ally.id)}
                  onToggle={() => toggleAlly(ally.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={selectedIds.size === 0 || createDM.isPending}
            className="w-full"
          >
            {createDM.isPending
              ? "Creating..."
              : selectedIds.size > 1
                ? "Create Group DM"
                : "Create DM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AllySelectRow({
  ally,
  selected,
  onToggle,
}: {
  ally: Ally
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        selected
          ? "bg-primary/10 text-foreground"
          : "hover:bg-foreground/[0.04]"
      )}
    >
      <UserAvatar name={ally.name} src={ally.image} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{ally.name}</div>
        {ally.username && (
          <div className="truncate text-xs text-muted-foreground">
            @{ally.displayUsername ?? ally.username}
          </div>
        )}
      </div>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  )
}
