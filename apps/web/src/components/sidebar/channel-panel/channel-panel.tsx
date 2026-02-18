import { ScrollArea } from "@repo/ui/components/scroll-area"
import { ChannelList } from "./channel-list"
import { GuildHeader } from "./guild-header"
import { SearchBar } from "./search-bar"
import { UserBar } from "./user-bar"

export function ChannelPanel() {
  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <GuildHeader />
      <SearchBar />
      <ScrollArea className="flex-1 px-2 pt-3">
        <ChannelList />
      </ScrollArea>
      <UserBar />
    </div>
  )
}
