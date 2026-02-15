import { ChannelPanel } from "./channel-panel"
import { GuildBar } from "./guild-bar"

export function Sidebar() {
  return (
    <div className="flex">
      <GuildBar />
      <ChannelPanel />
    </div>
  )
}
