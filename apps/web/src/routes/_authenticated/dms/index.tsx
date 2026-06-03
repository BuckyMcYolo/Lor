import { createFileRoute } from "@tanstack/react-router"
import { LeftSidebarToggle } from "@/components/sidebar/sidebar-toggle"

export const Route = createFileRoute("/_authenticated/dms/")({
  component: DMsIndex,
})

function DMsIndex() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <LeftSidebarToggle className="-ml-2" />
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Select a conversation to get started
      </div>
    </div>
  )
}
