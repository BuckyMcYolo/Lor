import { Image } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import { PinnedMessagesPanel } from "./pinned-messages-panel"
import type { RightSidebarView } from "./right-sidebar-types"
import { ThreadPanel } from "./thread-panel"
import { WorkspaceMembersPanel } from "./workspace-members-panel"

function PlaceholderSidebar({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 rounded-full bg-foreground/5 p-3 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

const viewTransition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as const,
}

export function RightSidebarPanel({ view }: { view: RightSidebarView }) {
  // Use view.type as the key for AnimatePresence — switching between views
  // unmounts the old and mounts the new with the slide/fade transition.
  // For thread we also key on threadRootId so jumping between threads
  // re-runs the entry animation.
  const key = view.type === "thread" ? `thread:${view.threadRootId}` : view.type

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={{ x: 18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -12, opacity: 0 }}
          transition={viewTransition}
          className="flex h-full w-full flex-col"
        >
          {view.type === "workspace-members" && (
            <WorkspaceMembersPanel view={view} />
          )}
          {view.type === "pinned-messages" && (
            <PinnedMessagesPanel view={view} />
          )}
          {view.type === "thread" && <ThreadPanel view={view} />}
          {view.type === "attachments" && (
            <PlaceholderSidebar
              title="Attachments"
              description="This mode can show channel attachments and media history."
              icon={<Image className="size-5" />}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
