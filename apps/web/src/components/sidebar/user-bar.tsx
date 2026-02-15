import { authClient } from "@repo/auth/client"
import { Settings } from "lucide-react"
import { UserAvatar } from "../user-avatar"

export function UserBar() {
  const { data: session } = authClient.useSession()

  const name = session?.user.name ?? "User"
  const username = session?.user.name ?? "user"

  return (
    <div className="border-t border-border px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <UserAvatar name={name} size="sm" />
          <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-card bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight">
            {username}
          </div>
          <div className="truncate text-[11px] leading-tight text-muted-foreground">
            Online
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  )
}
