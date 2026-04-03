import { useEffect, useState } from "react"

declare const __BUILD_ID__: string

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`)
        if (!res.ok) return
        const { buildId } = (await res.json()) as { buildId: string }
        if (buildId && buildId !== __BUILD_ID__) {
          setUpdateAvailable(true)
        }
      } catch {
        // Network error, ignore
      }
    }

    const interval = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const refresh = () => window.location.reload()

  return { updateAvailable, refresh }
}
