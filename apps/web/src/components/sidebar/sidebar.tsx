import { ScrollArea } from "@repo/ui/components/scroll-area"
import { ChannelList } from "./channel-list"
import { GuildHeader } from "./guild-header"
import { SearchBar } from "./search-bar"
import { UserBar } from "./user-bar"

export function Sidebar() {
  return (
    <div className="flex w-[248px] shrink-0 flex-col border-r border-border bg-card">
      <GuildHeader />
      <SearchBar />
      <ScrollArea className="flex-1 px-3 pt-3">
        <ChannelList />
      </ScrollArea>
      <UserBar />
    </div>
  )
}
