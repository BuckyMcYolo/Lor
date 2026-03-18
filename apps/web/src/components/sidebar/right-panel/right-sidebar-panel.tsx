import { Image, MessageSquareQuote } from "lucide-react"
import type { ReactNode } from "react"
import { GuildMembersPanel } from "./guild-members-panel"
import { PinnedMessagesPanel } from "./pinned-messages-panel"
import type { RightSidebarView } from "./right-sidebar-types"

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

export function RightSidebarPanel({ view }: { view: RightSidebarView }) {
  return (
    <aside className="hidden h-full w-[360px] min-w-[360px] shrink-0 border-l border-border bg-card xl:flex">
      {view.type === "guild-members" && <GuildMembersPanel view={view} />}
      {view.type === "pinned-messages" && <PinnedMessagesPanel view={view} />}
      {view.type === "thread" && (
        <PlaceholderSidebar
          title="Thread View"
          description="Thread details and replies can be rendered in this sidebar mode."
          icon={<MessageSquareQuote className="size-5" />}
        />
      )}
      {view.type === "attachments" && (
        <PlaceholderSidebar
          title="Attachments"
          description="This mode can show channel attachments and media history."
          icon={<Image className="size-5" />}
        />
      )}
    </aside>
  )
}
