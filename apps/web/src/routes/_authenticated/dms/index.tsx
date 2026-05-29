import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dms/")({
  component: DMsIndex,
})

function DMsIndex() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      Select a conversation to get started
    </div>
  )
}
