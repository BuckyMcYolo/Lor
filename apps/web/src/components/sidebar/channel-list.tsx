import { cn } from "@repo/ui/lib/utils"
import { Hash, Volume2 } from "lucide-react"
import { UserAvatar } from "../ui/user-avatar"

// Hardcoded mock data — will be replaced with real data
const channels = [
  { name: "general", active: true, unread: false },
  { name: "introductions", active: false, unread: true },
  { name: "development", active: false, unread: false },
  { name: "design", active: false, unread: false },
  { name: "off-topic", active: false, unread: true },
]

const voiceChannels = [
  { name: "Lounge", usersIn: ["Sam Chen", "Jordan Blake"] },
  { name: "Dev Session", usersIn: [] as string[] },
]

export function ChannelList() {
  return (
    <nav>
      {/* Text Channels */}
      <span className="mb-1 block px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Channels
      </span>
      {channels.map((ch) => (
        <div
          key={ch.name}
          className={cn(
            "relative flex items-center gap-2 rounded-lg px-2 py-[6px] text-[14px]",
            ch.active
              ? "bg-foreground/[0.06] font-medium text-foreground"
              : ch.unread
                ? "font-medium text-foreground"
                : "text-muted-foreground"
          )}
        >
          {ch.active && (
            <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
          )}
          <Hash className="size-[16px] shrink-0 opacity-50" />
          <span className="truncate">{ch.name}</span>
          {ch.unread && !ch.active && (
            <div className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" />
          )}
        </div>
      ))}

      {/* Voice Channels */}
      <span className="mb-1 mt-5 block px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Voice
      </span>
      {voiceChannels.map((ch) => (
        <div key={ch.name}>
          <div className="flex items-center gap-2 rounded-lg px-2 py-[6px] text-[14px] text-muted-foreground">
            <Volume2 className="size-[16px] shrink-0 opacity-50" />
            <span className="truncate">{ch.name}</span>
            {ch.usersIn.length > 0 && (
              <div className="ml-auto flex items-center gap-1">
                <div className="flex gap-[3px]">
                  <div className="h-3 w-[2px] animate-pulse rounded-full bg-emerald-500" />
                  <div className="h-2 w-[2px] animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
                  <div className="h-3.5 w-[2px] animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
                </div>
                <span className="text-[11px] text-emerald-600">
                  {ch.usersIn.length}
                </span>
              </div>
            )}
          </div>
          {ch.usersIn.length > 0 && (
            <div className="mb-1 ml-2 space-y-px">
              {ch.usersIn.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground"
                >
                  <UserAvatar name={name} size="sm" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
