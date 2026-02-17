import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

const LAST_PATH_KEY = "townhall:last-path"

export const Route = createFileRoute("/_authenticated/")({
  component: RedirectHome,
})

function RedirectHome() {
  const navigate = useNavigate()

  useEffect(() => {
    const lastPath = localStorage.getItem(LAST_PATH_KEY)
    navigate({ to: lastPath && lastPath !== "/" ? lastPath : "/dms" })
  }, [navigate])

  return null
}
