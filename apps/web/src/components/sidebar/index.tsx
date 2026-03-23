import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useDefaultLayout,
} from "@repo/ui/components/resizable"
import { cn } from "@repo/ui/lib/utils"
import { useParams } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useRef, useState } from "react"
import { ChannelPanel } from "./channel-panel/channel-panel"
import { DMPanel } from "./dm-panel/dm-panel"
import { GuildBar } from "./guild-bar/guild-bar"
import {
  RightSidebarProvider,
  useRightSidebar,
} from "./right-panel/right-sidebar-context"
import { RightSidebarPanel } from "./right-panel/right-sidebar-panel"

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { guildSlug } = useParams({ strict: false })
  const { view, isCollapsed, panelWidth, setPanelWidth, isHydrated } =
    useRightSidebar()
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(panelWidth)

  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    groupId: "townhall-sidebar",
    storage: localStorage,
  })

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
        // Commit width first so the next render has the correct value
        setPanelWidth(widthRef.current)
        // Use rAF to clear resizing after React has committed the new width
        requestAnimationFrame(() => setIsResizing(false))
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [panelWidth, setPanelWidth]
  )

  const showRightPanel = !!view && !!guildSlug

  return (
    <div className="flex h-full w-full">
      <GuildBar />
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChange={onLayoutChange}
      >
        <ResizablePanel defaultSize="240px" minSize="180px" maxSize="420px">
          {guildSlug ? <ChannelPanel /> : <DMPanel />}
        </ResizablePanel>
        <ResizableHandle className="bg-border hover:!bg-primary data-[resize-handle-active]:!bg-primary" />
        <ResizablePanel>
          <div className="flex h-full min-w-0 overflow-hidden">
            <div className="h-full min-w-0 flex-1">{children}</div>
            {showRightPanel && isHydrated && (
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    ref={panelRef}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: panelWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{
                      duration: isResizing ? 0 : 0.2,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    className="flex h-full overflow-hidden"
                  >
                    <div
                      onMouseDown={handleMouseDown}
                      className={cn(
                        "relative flex h-full w-1.5 shrink-0 cursor-ew-resize items-center justify-center",
                        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border",
                        isResizing
                          ? "after:!bg-primary"
                          : "hover:after:!bg-primary"
                      )}
                    />
                    <div className="h-full min-w-0 flex-1 overflow-hidden">
                      <RightSidebarPanel view={view} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <RightSidebarProvider>
      <SidebarLayout>{children}</SidebarLayout>
    </RightSidebarProvider>
  )
}
