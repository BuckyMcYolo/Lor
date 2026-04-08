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

// v0.1.2
function BrowserNotifications() {
  useBrowserNotifications()
  return null
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

function UpdateBanner() {
  const { updateAvailable, refresh } = useUpdateCheck()
  if (!updateAvailable) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg">
        <span className="text-sm font-medium text-foreground">
          A new version is available
        </span>
        <button
          type="button"
          onClick={refresh}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {isTauri ? "Update" : "Refresh"}
        </button>
      </div>
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
            <div className="flex h-screen overflow-hidden bg-background text-foreground">
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
