import { Sheet, SheetContent } from "@repo/ui/components/sheet"
import {
  Sidebar as ShadcnSidebar,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@repo/ui/components/sidebar"
import { useIsMobile } from "@repo/ui/hooks/use-mobile"
import { cn } from "@repo/ui/lib/utils"
import { useParams } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { UserBar } from "@/components/sidebar/channel-panel/user-bar"
import { DMSidebarContent } from "@/components/sidebar/dm-sidebar"
import {
  RightSidebarProvider,
  useRightSidebar,
} from "@/components/sidebar/right-panel/right-sidebar-context"
import { RightSidebarPanel } from "@/components/sidebar/right-panel/right-sidebar-panel"
import { WorkspaceSidebarContent } from "@/components/sidebar/workspace-sidebar"

/**
 * URL-driven left sidebar with a book-page-turn transition:
 *   /$workspaceSlug/...  → WorkspaceSidebarContent (channels)
 *   /dms/...              → DMSidebarContent       (DM list)
 *
 * Both contents are hosted inside a single Sidebar shell so the user-bar
 * footer stays anchored across mode switches — only the contextual
 * content (header + scrollable body) pivots around the left edge like a
 * turning book page.
 */
function LeftSidebar() {
  const { workspaceSlug } = useParams({ strict: false })
  const isWorkspace = !!workspaceSlug

  return (
    <ShadcnSidebar variant="inset">
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        style={{ perspective: 1400 }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={isWorkspace ? "workspace" : "dm"}
            initial={{ rotateY: 78, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -78, opacity: 0 }}
            transition={{
              rotateY: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            }}
            style={{
              transformOrigin: "0% 50%",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
            className="absolute inset-0 flex h-full w-full flex-col"
          >
            {isWorkspace ? <WorkspaceSidebarContent /> : <DMSidebarContent />}
          </motion.div>
        </AnimatePresence>
      </div>
      <SidebarFooter>
        <UserBar />
      </SidebarFooter>
    </ShadcnSidebar>
  )
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
      {/* Resize handle — pulled left with -ml-2 so its hit area overlaps
          the inset's `mr-2` gap; the visible stroke sits at left-0, flush
          with the inset's right border (which is the line users see). */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "relative -ml-2 hidden h-full w-2 shrink-0 cursor-ew-resize items-center justify-center md:flex",
            "after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-transparent",
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

const LEFT_SIDEBAR_WIDTH_KEY = "lor:left-sidebar-width"
const LEFT_SIDEBAR_MIN = 200
const LEFT_SIDEBAR_MAX = 400
const LEFT_SIDEBAR_DEFAULT = 240

function getStoredLeftSidebarWidth(): number {
  try {
    const stored = localStorage.getItem(LEFT_SIDEBAR_WIDTH_KEY)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (parsed >= LEFT_SIDEBAR_MIN && parsed <= LEFT_SIDEBAR_MAX)
        return parsed
    }
  } catch {}
  return LEFT_SIDEBAR_DEFAULT
}

/**
 * Desktop-only drag handle that resizes the left sidebar. Positioned `fixed`
 * at the sidebar's right edge so it tracks `--sidebar-width` and works
 * regardless of the inset card's internal padding. Hidden when the sidebar
 * is collapsed (offcanvas variant has 0 width then — nothing to drag).
 */
function LeftSidebarResizeHandle({
  width,
  onWidthChange,
}: {
  width: number
  onWidthChange: (width: number) => void
}) {
  const { state, isMobile } = useSidebar()
  const [isResizing, setIsResizing] = useState(false)
  const widthRef = useRef(width)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)

      const startX = e.clientX
      const startWidth = width
      widthRef.current = startWidth

      const wrapper = document.querySelector<HTMLElement>(
        "[data-slot='sidebar-wrapper']"
      )
      // Sidebar gap + container animate `width` over 200ms — without disabling
      // those transitions, the panel lags behind the cursor during drag.
      const transitionTargets = document.querySelectorAll<HTMLElement>(
        "[data-slot='sidebar-gap'], [data-slot='sidebar-container']"
      )
      for (const el of transitionTargets) {
        el.style.transition = "none"
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        const next = Math.min(
          Math.max(startWidth + delta, LEFT_SIDEBAR_MIN),
          LEFT_SIDEBAR_MAX
        )
        widthRef.current = next
        // SidebarProvider sets --sidebar-width inline on its wrapper, which
        // wins over any value set on documentElement. Mutate the wrapper
        // directly so the drag is visible immediately.
        wrapper?.style.setProperty("--sidebar-width", `${next}px`)
      }

      const handleMouseUp = () => {
        onWidthChange(widthRef.current)
        for (const el of transitionTargets) {
          el.style.transition = ""
        }
        requestAnimationFrame(() => setIsResizing(false))
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [width, onWidthChange]
  )

  if (isMobile || state !== "expanded") return null

  return (
    <div
      onMouseDown={handleMouseDown}
      aria-hidden
      className={cn(
        "fixed top-0 bottom-0 z-50 hidden w-1.5 -translate-x-1/2 cursor-ew-resize md:block",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent",
        isResizing ? "after:!bg-primary" : "hover:after:!bg-primary/50"
      )}
      style={{ left: "var(--sidebar-width)" }}
    />
  )
}

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [width, setWidth] = useState(LEFT_SIDEBAR_DEFAULT)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setWidth(getStoredLeftSidebarWidth())
    setIsHydrated(true)
  }, [])

  const persistWidth = useCallback((next: number) => {
    setWidth(next)
    try {
      localStorage.setItem(LEFT_SIDEBAR_WIDTH_KEY, String(next))
    } catch {}
  }, [])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": isHydrated
            ? `${width}px`
            : `${LEFT_SIDEBAR_DEFAULT}px`,
        } as React.CSSProperties
      }
    >
      <LeftSidebar />
      <LeftSidebarResizeHandle width={width} onWidthChange={persistWidth} />
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
