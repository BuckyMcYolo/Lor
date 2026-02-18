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
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group"
import { useNavigate } from "@tanstack/react-router"
import {
  ChevronsUpDown,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { UserAvatar } from "../../ui/user-avatar"

export function UserBar() {
  const { data: session } = authClient.useSession()
  const { setTheme, theme } = useTheme()
  const navigate = useNavigate()

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
              <ToggleGroup
                size="sm"
                type="single"
                className="ml-auto flex gap-1 items-center border border-border rounded-lg px-1 h-8"
                value={theme}
                onValueChange={(value) => value && setTheme(value)}
              >
                <ToggleGroupItem
                  className="h-6 w-6 p-1.5 rounded-md"
                  value="light"
                >
                  <Sun className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  className="h-6 w-6 p-1.5 rounded-md"
                  value="dark"
                >
                  <Moon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  className="h-6 w-6 p-1.5 rounded-md"
                  value="system"
                >
                  <Laptop className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
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
