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

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { guildSlug } = useParams({ strict: false })

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
        <ResizablePanel>{children}</ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
