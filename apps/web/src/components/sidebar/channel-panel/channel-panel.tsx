import { ScrollArea } from "@repo/ui/components/scroll-area"
import { ChannelList } from "./channel-list"
import { GuildHeader } from "./guild-header"
import { SearchBar } from "./search-bar"
import { UserBar } from "./user-bar"

export function ChannelPanel() {
  return (
    <div className="flex h-full flex-col overflow-x-hidden border-r border-border bg-card">
      <GuildHeader />
      <SearchBar />
      <div className="min-h-0 flex-1 overflow-hidden px-2 pt-3">
        <ScrollArea className="h-full">
          <ChannelList />
          <div className="pb-3" />
        </ScrollArea>
      </div>
      <UserBar />
    </div>
  )
}
