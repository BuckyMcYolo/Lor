import { useCallback, useEffect, useRef, useState } from "react"

declare const __BUILD_ID__: string

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const tauriUpdateRef = useRef<Awaited<
    ReturnType<typeof import("@tauri-apps/plugin-updater").check>
  > | null>(null)

  useEffect(() => {
    // Web frontend version check (works for both browser and Tauri)
    const checkWeb = async () => {
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

    // Tauri native binary update check
    const checkTauri = async () => {
      if (!isTauri) return
      try {
        const { check } = await import("@tauri-apps/plugin-updater")
        const update = await check()
        if (update) {
          tauriUpdateRef.current = update
          setUpdateAvailable(true)
        }
      } catch {
        // Updater not available or check failed, ignore
      }
    }

    checkWeb()
    checkTauri()
    const interval = setInterval(checkWeb, POLL_INTERVAL)
    // Check for native updates less frequently (every 10 minutes)
    const tauriInterval = setInterval(checkTauri, 5 * POLL_INTERVAL)
    return () => {
      clearInterval(interval)
      clearInterval(tauriInterval)
    }
  }, [])

  const refresh = useCallback(async () => {
    // If there's a Tauri native update, download + install + relaunch
    if (isTauri && tauriUpdateRef.current) {
      try {
        setIsInstalling(true)
        await tauriUpdateRef.current.downloadAndInstall()
        const { relaunch } = await import("@tauri-apps/plugin-process")
        await relaunch()
      } catch {
        // Fall back to page reload if native update fails
        window.location.reload()
      }
      return
    }
    window.location.reload()
  }, [])

  return { updateAvailable, isInstalling, refresh }
}
