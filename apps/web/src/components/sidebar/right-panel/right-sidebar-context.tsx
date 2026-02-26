import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import type { RightSidebarView } from "./right-sidebar-types"

interface RightSidebarContextValue {
  view: RightSidebarView | null
  setView: (view: RightSidebarView | null) => void
  clearView: () => void
}

const RightSidebarContext = createContext<RightSidebarContextValue | null>(null)

export function RightSidebarProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<RightSidebarView | null>(null)

  const clearView = useCallback(() => {
    setView(null)
  }, [])

  const value = useMemo<RightSidebarContextValue>(
    () => ({
      view,
      setView,
      clearView,
    }),
    [view, clearView]
  )

  return (
    <RightSidebarContext.Provider value={value}>
      {children}
    </RightSidebarContext.Provider>
  )
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext)
  if (!context) {
    throw new Error("useRightSidebar must be used within RightSidebarProvider")
  }
  return context
}
