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
import { SettingsDialog } from "../components/settings/settings-dialog"
import { Sidebar } from "../components/sidebar"
import { MobileSidebarProvider } from "../context/mobile-sidebar-context"
import { SettingsProvider } from "../context/settings-context"
import { SocketProvider } from "../context/socket-context"
import { UnreadProvider } from "../context/unread-context"
import { useBrowserNotifications } from "../hooks/use-browser-notifications"
import { useUpdateCheck } from "../hooks/use-update-check"

// v0.1.1
function BrowserNotifications() {
  useBrowserNotifications()
  return null
}

function UpdateBanner() {
  const { updateAvailable, refresh } = useUpdateCheck()
  if (!updateAvailable) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground">
      <span>A new version of Townhall is available.</span>
      <button
        type="button"
        onClick={refresh}
        className="underline underline-offset-2 hover:opacity-80"
      >
        Refresh to update
      </button>
    </div>
  )
}

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
  const isInviteRoute = location.pathname.startsWith("/invite/")
  const showOnboarding =
    !isInviteRoute &&
    session.user.onboardingCompleted === false &&
    guilds !== undefined &&
    guilds?.length === 0

  return (
    <SocketProvider enabled={!!session}>
      <UnreadProvider>
        <SettingsProvider>
          <BrowserNotifications />
          <UpdateBanner />
          <MobileSidebarProvider>
            <div className="flex h-screen select-none overflow-hidden bg-background text-foreground">
              <Sidebar>
                <Outlet />
              </Sidebar>
              <OnboardingDialog open={showOnboarding} />
              <SettingsDialog />
            </div>
          </MobileSidebarProvider>
        </SettingsProvider>
      </UnreadProvider>
    </SocketProvider>
  )
}
