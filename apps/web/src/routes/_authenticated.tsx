import { authClient } from "@repo/auth/client"
import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { OnboardingDialog } from "../components/onboarding/onboarding-dialog"
import { Sidebar } from "../components/sidebar"

const LAST_PATH_KEY = "townhall:last-path"

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/login" })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (location.pathname !== "/") {
      localStorage.setItem(LAST_PATH_KEY, location.pathname)
    }
  }, [location.pathname])

  const { data: guilds } = useQuery({
    queryKey: ["guilds"],
    queryFn: async () => {
      const res = await authClient.organization.list()
      return res.data
    },
    enabled: !!session,
  })

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Only show onboarding if explicitly not completed AND no existing guilds
  // (guards against existing users whose flag defaulted to false)
  const showOnboarding =
    session.user.onboardingCompleted === false &&
    guilds !== undefined &&
    guilds?.length === 0

  return (
    <div className="flex h-screen select-none overflow-hidden bg-background text-foreground">
      <Sidebar>
        <Outlet />
      </Sidebar>
      <OnboardingDialog open={showOnboarding} />
    </div>
  )
}
