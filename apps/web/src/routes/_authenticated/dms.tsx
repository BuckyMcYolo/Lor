import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dms")({
  component: DMsLayout,
})

function DMsLayout() {
  return <Outlet />
}
