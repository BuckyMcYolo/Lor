import { authClient } from "@repo/auth/client"
import { Badge } from "@repo/ui/components/badge"
import { Button } from "@repo/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover"
import { Skeleton } from "@repo/ui/components/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { MessageCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { UserAvatar } from "./user-avatar"

function ProfileCardContent({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const { data, isPending, isError } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const res = await apiClient.v1.users[":userId"].$get({
        param: { userId },
      })
      if (!res.ok) throw new Error("Failed to fetch user profile")
      return res.json()
    },
  })

  const navigate = useNavigate()

  const createDM = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.dms.$post({
        json: { userIds: [userId] },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(
          "message" in body ? body.message : "Failed to create DM"
        )
      }
      return res.json()
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["dms"] })
      void navigate({ to: "/dms/$dmId", params: { dmId: data.dm.id } })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (isPending) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
        <Skeleton className="h-8 w-full rounded" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="text-sm text-muted-foreground">
        Failed to load profile.
      </div>
    )
  }

  const user = data.user
  const isCurrentUser = session?.user?.id === userId
  const isMutating = createDM.isPending

  return (
    <div className="space-y-3">
      {/* Avatar + name + presence */}
      <div className="relative flex items-center gap-3">
        {isCurrentUser && (
          <Badge
            variant="secondary"
            className="absolute -top-1 right-0 text-[10px]"
          >
            Me
          </Badge>
        )}
        <div className="relative shrink-0">
          <UserAvatar name={user.name} src={user.image} className="size-12" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-popover ${
              user.presenceStatus === "online"
                ? "bg-emerald-500"
                : "bg-muted-foreground/40"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          {user.username && (
            <div className="truncate text-xs text-muted-foreground">
              @{user.displayUsername ?? user.username}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {user.status && (
        <div className="text-xs text-muted-foreground">{user.status}</div>
      )}

      {/* Bio */}
      {user.bio && (
        <div className="border-t border-border pt-2 text-xs text-muted-foreground">
          {user.bio}
        </div>
      )}

      {/* Member since */}
      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
        Member since{" "}
        {new Date(user.createdAt).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })}
      </div>

      {/* Actions row */}
      {!isCurrentUser && (
        <div className="flex items-center gap-1.5">
          {/* Send DM */}
          <div className="flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-full"
                  disabled={isMutating}
                  onClick={() => createDM.mutate()}
                >
                  <MessageCircle className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send DM</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  )
}

export function UserProfilePopover({
  userId,
  children,
  side = "right",
  align = "start",
}: {
  userId: string
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {open && <ProfileCardContent userId={userId} />}
      </PopoverContent>
    </Popover>
  )
}
