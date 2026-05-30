import { Sheet, SheetContent } from "@repo/ui/components/sheet"
import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { cn } from "@repo/ui/lib/utils"
import { useParams } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { DMSidebar } from "./dm-sidebar"
import {
  RightSidebarProvider,
  useRightSidebar,
} from "./right-panel/right-sidebar-context"
import { RightSidebarPanel } from "./right-panel/right-sidebar-panel"
import { WorkspaceSidebar } from "./workspace-sidebar"

/**
 * URL-driven left sidebar selection:
 *   /$workspaceSlug/...  → WorkspaceSidebar (channels)
 *   /dms/...              → DMSidebar       (DM list)
 * See PIVOT.md "Navigation & sidebar IA".
 */
function LeftSidebar() {
  const { workspaceSlug } = useParams({ strict: false })
  return workspaceSlug ? <WorkspaceSidebar /> : <DMSidebar />
}

/**
 * Right-side floating inset card. Lives as a sibling of SidebarInset on
 * the SidebarProvider canvas, mirroring the left sidebar's floating look:
 * `bg-sidebar` with rounded corners, a small margin gap, and a soft
 * shadow. This is a deliberate visual choice — the right panel hosts
 * Merlin threads (and members / pinned / threads), so it needs its own
 * visual identity rather than blending into the main chat surface.
 */
function RightPanelDock() {
  const { workspaceSlug } = useParams({ strict: false })
  const { view, isCollapsed, panelWidth, setPanelWidth, isHydrated } =
    useRightSidebar()
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(panelWidth)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)

      const startX = e.clientX
      const startWidth = panelWidth

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX
        const newWidth = Math.min(Math.max(startWidth + delta, 240), 480)
        if (panelRef.current) {
          panelRef.current.style.width = `${newWidth}px`
        }
        widthRef.current = newWidth
      }

      const handleMouseUp = () => {
        setPanelWidth(widthRef.current)
        requestAnimationFrame(() => setIsResizing(false))
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [panelWidth, setPanelWidth]
  )

  const showRightPanel = !!view && !!workspaceSlug

  if (!showRightPanel || !isHydrated) return null

  return (
    <>
      {/* Resize handle — sits in the gap between main inset and right panel */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "relative hidden h-full w-1.5 shrink-0 cursor-ew-resize items-center justify-center md:flex",
            "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent",
            isResizing ? "after:!bg-primary" : "hover:after:!bg-primary/50"
          )}
        />
      )}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.aside
            ref={panelRef}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{
              duration: isResizing ? 0 : 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            className={cn(
              "hidden h-full shrink-0 overflow-hidden md:flex",
              "bg-sidebar text-sidebar-foreground",
              "md:my-2 md:mr-2 md:rounded-xl"
            )}
          >
            <div className="h-full min-w-0 flex-1 overflow-hidden">
              <RightSidebarPanel view={view} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function MainArea({ children }: { children: React.ReactNode }) {
  return (
    <SidebarInset className="min-w-0 md:my-2 md:mr-2 md:rounded-xl md:border md:border-border/60 md:shadow-none">
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden md:rounded-[inherit]">
        {children}
      </div>
    </SidebarInset>
  )
}

/**
 * Mobile-only right panel: renders as a slide-in sheet from the right edge
 * since there's no room for a floating panel on small viewports.
 */
function MobileRightPanel() {
  const { view, clearView } = useRightSidebar()
  const { workspaceSlug } = useParams({ strict: false })
  const open = !!view && !!workspaceSlug

  // If the user navigates away from a workspace while the panel is open,
  // close it — it's workspace-scoped.
  useEffect(() => {
    if (!workspaceSlug && view) clearView()
  }, [workspaceSlug, view, clearView])

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) clearView()
      }}
      modal
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[300px] bg-sidebar p-0 sm:max-w-[300px]"
      >
        {view && <RightSidebarPanel view={view} />}
      </SheetContent>
    </Sheet>
  )
}

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <LeftSidebar />
      <MainArea>{children}</MainArea>
      {isMobile ? <MobileRightPanel /> : <RightPanelDock />}
    </SidebarProvider>
  )
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <RightSidebarProvider>
      <SidebarLayout>{children}</SidebarLayout>
    </RightSidebarProvider>
  )
}
