import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dms/")({
  component: DMsHome,
})

function DMsHome() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-sm text-muted-foreground">
        Select a conversation to start chatting
      </span>
    </div>
  )
}
