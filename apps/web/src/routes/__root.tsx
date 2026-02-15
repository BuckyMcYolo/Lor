import { createRootRoute, Outlet } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )
  : () => null

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Suspense>{/*<TanStackRouterDevtools />*/}</Suspense>
    </>
  ),
})
