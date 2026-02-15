import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
})

function Home() {
  const { data: session } = authClient.useSession()

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Townhall</h1>
      {session && (
        <p className="text-muted-foreground text-sm">
          Welcome, {session.user.name}
        </p>
      )}
      <Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
        Sign out
      </Button>
    </div>
  )
}
