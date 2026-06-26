import { Button } from "@repo/ui/components/button"
import { useSidebar } from "@repo/ui/components/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { SidebarToggleIcon } from "@repo/ui/components/unlumen-ui/sidebar-toggle-icon"
import { cn } from "@repo/ui/lib/utils"
import { useRightSidebar } from "@/components/sidebar/right-panel/right-sidebar-context"

/**
 * Left-sidebar toggle. Anchored to shadcn's `useSidebar` open state so the
 * SidebarToggleIcon morphs between open/closed states whenever the sidebar
 * is opened or collapsed.
 */
export function LeftSidebarToggle({ className }: { className?: string }) {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar()
  const isOpen = isMobile ? openMobile : open

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "size-7 text-muted-foreground hover:text-foreground",
            className
          )}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <SidebarToggleIcon
            isOpen={isOpen}
            className="size-4"
            strokeWidth={1.5}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isOpen ? "Collapse sidebar" : "Expand sidebar"}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Right-panel "open" affordance for the chat header. Renders only when the
 * right panel is currently CLOSED — when it's open, the panel itself
 * carries the close button in its top-right corner, so showing this here
 * would duplicate the control.
 */
export function RightPanelToggle({
  workspaceSlug,
  channelId,
  className,
}: {
  workspaceSlug: string
  channelId: string
  className?: string
}) {
  const { view, setView, isCollapsed, toggleCollapsed } = useRightSidebar()
  const isMobileSidebar = useSidebar().isMobile

  const isOpen = !!view && (isMobileSidebar || !isCollapsed)
  if (isOpen) return null

  const handleClick = () => {
    if (view && isCollapsed && !isMobileSidebar) {
      toggleCollapsed()
      return
    }
    setView({
      type: "workspace-members",
      workspaceSlug,
      channelId,
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn(
            "size-7 text-muted-foreground hover:text-foreground",
            className
          )}
          aria-label="Open side panel"
        >
          <SidebarToggleIcon
            isOpen={false}
            className="size-4 -scale-x-100"
            strokeWidth={1.5}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Show panel</TooltipContent>
    </Tooltip>
  )
}
