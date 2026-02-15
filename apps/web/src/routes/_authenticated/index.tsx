import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
})

function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-sm text-muted-foreground">
        Select a channel to start chatting
      </span>
    </div>
  )
}
