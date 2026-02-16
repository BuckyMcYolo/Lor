import { ChannelPanel } from "./channel-panel/channel-panel"
import { GuildBar } from "./guild-bar/guild-bar"

export function Sidebar() {
  return (
    <div className="flex">
      <GuildBar />
      <ChannelPanel />
    </div>
  )
}
