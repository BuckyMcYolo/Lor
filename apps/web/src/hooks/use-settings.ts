import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback } from "react"

export type SettingsTarget = "user" | "workspace"

// URL-driven settings dialogs: ?settings=user|workspace&tab=<section>.
export function useSettings() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const target = search.settings as SettingsTarget | undefined
  const tab = search.tab as string | undefined

  const open = useCallback(
    (next: SettingsTarget, nextTab?: string) =>
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, settings: next, tab: nextTab }),
      }),
    [navigate]
  )

  const close = useCallback(
    () =>
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, settings: undefined, tab: undefined }),
      }),
    [navigate]
  )

  const setTab = useCallback(
    (nextTab: string) =>
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, tab: nextTab }),
        replace: true,
      }),
    [navigate]
  )

  return { target, tab, open, close, setTab }
}
