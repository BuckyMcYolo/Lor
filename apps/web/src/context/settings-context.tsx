import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useState } from "react"

interface SettingsContextValue {
  isOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return ctx
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openSettings = useCallback(() => setIsOpen(true), [])
  const closeSettings = useCallback(() => setIsOpen(false), [])

  return (
    <SettingsContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
