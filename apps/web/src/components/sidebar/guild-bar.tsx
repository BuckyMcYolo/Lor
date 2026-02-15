import { cn } from "@repo/ui/lib/utils"
import { MessageCircle, Plus } from "lucide-react"

// Mock data — will be replaced with real data
const guilds = [
  { id: "1", name: "Townhall", active: true },
  { id: "2", name: "Design Team", active: false },
  { id: "3", name: "Open Source", active: false },
]

function GuildIcon({ name, active }: { name: string; active: boolean }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <div className="group relative flex items-center justify-center px-3 py-1">
      {/* Left pill indicator */}
      <div
        className={cn(
          "absolute left-0 w-1 rounded-r-full bg-foreground transition-all",
          active ? "h-10" : "h-0 group-hover:h-5"
        )}
      />

      <div
        className={cn(
          "flex size-12 items-center justify-center text-[15px] font-semibold transition-all",
          active
            ? "rounded-2xl bg-primary text-primary-foreground"
            : "rounded-[24px] bg-muted text-muted-foreground hover:rounded-2xl hover:bg-primary hover:text-primary-foreground"
        )}
      >
        {initials}
      </div>
    </div>
  )
}

export function GuildBar() {
  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center bg-background py-3">
      {/* Home / DMs button */}
      <div className="group relative flex items-center justify-center px-3 py-1">
        <div className="absolute left-0 h-0 w-1 rounded-r-full bg-foreground transition-all group-hover:h-5" />
        <div className="flex size-12 items-center justify-center rounded-[24px] bg-muted text-muted-foreground transition-all hover:rounded-2xl hover:bg-primary hover:text-primary-foreground">
          <MessageCircle className="size-6" />
        </div>
      </div>

      {/* Separator */}
      <div className="mx-auto my-1 h-px w-8 rounded-full bg-border" />

      {/* Guild icons */}
      {guilds.map((guild) => (
        <GuildIcon key={guild.id} name={guild.name} active={guild.active} />
      ))}

      {/* Separator */}
      <div className="mx-auto my-1 h-px w-8 rounded-full bg-border" />

      {/* Add guild button */}
      <div className="group relative flex items-center justify-center px-3 py-1">
        <div className="flex size-12 items-center justify-center rounded-[24px] bg-muted text-emerald-500 transition-all hover:rounded-2xl hover:bg-emerald-500 hover:text-white">
          <Plus className="size-6" />
        </div>
      </div>
    </div>
  )
}
