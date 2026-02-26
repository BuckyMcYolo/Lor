import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useEffect } from "react"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"

export const Route = createFileRoute("/_authenticated/dms")({
  component: DMsLayout,
})

function DMsLayout() {
  const { clearView } = useRightSidebar()

  useEffect(() => {
    clearView()
  }, [clearView])

  return <Outlet />
}
