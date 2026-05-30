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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar"
import { cn } from "@repo/ui/lib/utils"
import {
  ChevronsUpDown,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react"
import { LayoutGroup, motion } from "motion/react"
import { useTheme } from "next-themes"
import { useSettings } from "@/context/settings-context"
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
    <LayoutGroup>
      <div className="ml-auto flex items-center rounded-lg border border-border bg-background p-1 h-8">
        {themes.map(({ value, icon: Icon, label }) => {
          const isActive = theme === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className="relative flex h-6 w-6 items-center justify-center rounded-md cursor-pointer"
              aria-pressed={isActive}
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
    </LayoutGroup>
  )
}

export function UserBar() {
  const { data: session } = authClient.useSession()
  const { setTheme, theme } = useTheme()
  const { openSettings } = useSettings()
  const { isMobile } = useSidebar()
  const name = session?.user.name ?? "User"
  const email = session?.user.email ?? ""

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } catch (err) {
      console.error("Sign out failed:", err)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  name={name}
                  src={session?.user.image}
                  size="sm"
                  className="rounded-lg"
                />
                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-sidebar bg-emerald-500" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar
                  name={name}
                  src={session?.user.image}
                  size="sm"
                  className="rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-default"
              onSelect={(e) => e.preventDefault()}
            >
              Theme
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={openSettings}>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
