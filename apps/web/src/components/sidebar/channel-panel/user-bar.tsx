import { authClient } from "@repo/auth/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { cn } from "@repo/ui/lib/utils"
// import { useNavigate } from "@tanstack/react-router"
import {
  ChevronsUpDown,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react"
import { motion } from "motion/react"
import { useTheme } from "next-themes"
import { UserAvatar } from "../../ui/user-avatar"

const themes = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Laptop, label: "System" },
] as const

function ThemeSwitcher({
  theme,
  setTheme,
}: {
  theme: string | undefined
  setTheme: (theme: string) => void
}) {
  return (
    <div className="ml-auto flex items-center rounded-lg border border-border bg-background p-1 h-8">
      {themes.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className="relative flex h-6 w-6 items-center justify-center rounded-md cursor-pointer"
            aria-label={`Switch to ${label} theme`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-switcher-pill"
                className="absolute inset-0 rounded-md bg-accent"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <Icon
              className={cn(
                "relative z-10 h-3.5 w-3.5 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export function UserBar() {
  const { data: session } = authClient.useSession()
  const { setTheme, theme } = useTheme()
  const name = session?.user.name ?? "User"
  const email = session?.user.email ?? ""

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } catch (err) {
      console.error("Sign out failed:", err)
    }
  }

  const handleOpenSettings = () => {
    // TODO: Navigate to settings page
    // navigate({ to: "/settings" })
  }

  return (
    <div className="border-t border-border px-2 py-2">
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex flex-1 min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-foreground/5"
            >
              <div className="relative">
                <UserAvatar name={name} src={session?.user.image} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-card bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[13px] font-semibold leading-tight">
                  {name}
                </div>
                <div className="truncate text-[11px] leading-tight text-muted-foreground">
                  Online
                </div>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="top"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar name={name} src={session?.user.image} size="sm" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuItem
              className="cursor-default"
              onSelect={(e) => e.preventDefault()}
            >
              Theme
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={handleOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label="Open settings"
          title="Open settings"
          onClick={handleOpenSettings}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  )
}
