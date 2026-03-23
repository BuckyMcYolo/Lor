import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@repo/ui/components/sidebar"
import {
  Bell,
  Globe,
  Keyboard,
  type LucideIcon,
  MessageCircle,
  Paintbrush,
  Search,
  Settings,
  Shield,
  User,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useSettings } from "@/context/settings-context"
import { MyAccountSettings } from "./my-account-settings"
import { NotificationSettings } from "./notification-settings"
import { PrivacySafetySettings } from "./privacy-safety-settings"

interface SettingsNav {
  name: string
  icon: LucideIcon
}

const settingsNav: SettingsNav[] = [
  { name: "My Account", icon: User },
  { name: "Appearance", icon: Paintbrush },
  { name: "Notifications", icon: Bell },
  { name: "Messages & Media", icon: MessageCircle },
  { name: "Language & Region", icon: Globe },
  { name: "Accessibility", icon: Keyboard },
  { name: "Privacy & Safety", icon: Shield },
  { name: "Advanced", icon: Settings },
]

export function SettingsDialog() {
  const { isOpen, closeSettings } = useSettings()
  const [activeItem, setActiveItem] = useState("My Account")
  const [search, setSearch] = useState("")

  const filteredNav = useMemo(() => {
    if (!search.trim()) return settingsNav
    const q = search.toLowerCase()
    return settingsNav.filter((item) => item.name.toLowerCase().includes(q))
  }, [search])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[700px] md:max-w-[850px] lg:max-w-[1000px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="min-h-0 items-start">
          <Sidebar collapsible="none" className="hidden border-r md:flex">
            <SidebarHeader>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search settings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8"
                  autoFocus={false}
                  tabIndex={-1}
                />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredNav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          isActive={item.name === activeItem}
                          onClick={() => setActiveItem(item.name)}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[660px] flex-1 flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center border-b px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <span className="text-muted-foreground">Settings</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeItem}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {activeItem === "My Account" ? (
                <MyAccountSettings />
              ) : activeItem === "Notifications" ? (
                <NotificationSettings />
              ) : activeItem === "Privacy & Safety" ? (
                <PrivacySafetySettings />
              ) : (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  {activeItem} settings coming soon.
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
