import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useDefaultLayout,
} from "@repo/ui/components/resizable"
import { useParams } from "@tanstack/react-router"
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
  const { view } = useRightSidebar()

  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    groupId: "townhall-sidebar",
    storage: localStorage,
  })

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
        <ResizableHandle className="bg-transparent" />
        <ResizablePanel>
          <div className="flex h-full min-w-0 overflow-hidden">
            <div className="min-w-0 flex-1">{children}</div>
            {view && <RightSidebarPanel view={view} />}
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
