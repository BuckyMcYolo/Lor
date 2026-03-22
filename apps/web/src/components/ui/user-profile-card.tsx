import { authClient } from "@repo/auth/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
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
import {
  Ban,
  Check,
  Clock,
  MessageCircle,
  ShieldOff,
  UserMinus,
  UserPlus,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import type { UserProfile } from "@/lib/api-types"
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

  const sendRequest = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.allies.requests.$post({
        json: { userId },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(
          "message" in body ? body.message : "Failed to send ally request"
        )
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", userId],
      })
      void queryClient.invalidateQueries({ queryKey: ["ally-requests"] })
      toast.success("Ally request sent")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiClient.v1.allies.requests[":requestId"].accept.$post(
        {
          param: { requestId },
        }
      )
      if (!res.ok) throw new Error("Failed to accept request")
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", userId],
      })
      void queryClient.invalidateQueries({ queryKey: ["allies"] })
      void queryClient.invalidateQueries({ queryKey: ["ally-requests"] })
      toast.success("Ally request accepted")
    },
    onError: () => {
      toast.error("Failed to accept request")
    },
  })

  const removeAlly = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.allies[":userId"].$delete({
        param: { userId },
      })
      if (!res.ok) throw new Error("Failed to remove ally")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", userId],
      })
      void queryClient.invalidateQueries({ queryKey: ["allies"] })
      toast.success("Ally removed")
    },
    onError: () => {
      toast.error("Failed to remove ally")
    },
  })

  const blockUser = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.blocks.$post({
        json: { userId },
      })
      if (!res.ok) throw new Error("Failed to block user")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", userId],
      })
      void queryClient.invalidateQueries({ queryKey: ["allies"] })
      void queryClient.invalidateQueries({ queryKey: ["ally-requests"] })
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] })
      void queryClient.invalidateQueries({ queryKey: ["dms"] })
      toast.success("User blocked")
    },
    onError: () => {
      toast.error("Failed to block user")
    },
  })

  const unblockUser = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.blocks[":userId"].$delete({
        param: { userId },
      })
      if (!res.ok) throw new Error("Failed to unblock user")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", userId],
      })
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] })
      toast.success("User unblocked")
    },
    onError: () => {
      toast.error("Failed to unblock user")
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

  const [confirmBlock, setConfirmBlock] = useState(false)
  const [confirmRemoveAlly, setConfirmRemoveAlly] = useState(false)

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
  const isBlockedByMe =
    user.blockStatus === "blocked_by_me" || user.blockStatus === "mutual_block"
  const isBlockedByThem =
    user.blockStatus === "blocked_by_them" ||
    user.blockStatus === "mutual_block"
  const isMutating =
    sendRequest.isPending ||
    acceptRequest.isPending ||
    removeAlly.isPending ||
    blockUser.isPending ||
    unblockUser.isPending ||
    createDM.isPending

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
      {user.status && !isBlockedByThem && (
        <div className="text-xs text-muted-foreground">{user.status}</div>
      )}

      {/* Bio */}
      {user.bio && !isBlockedByThem && (
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
        <>
          <div className="flex items-center gap-1.5">
            {/* Send DM */}
            {!isBlockedByMe && !isBlockedByThem && (
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
            )}

            {/* Ally action */}
            {!isBlockedByMe && !isBlockedByThem && (
              <div className="flex-1">
                <AllyActionIconButton
                  allyStatus={user.allyStatus}
                  allyRequestId={user.allyRequestId}
                  isMutating={isMutating}
                  onSendRequest={() => sendRequest.mutate()}
                  onAcceptRequest={(id) => acceptRequest.mutate(id)}
                  onRemoveAlly={() => setConfirmRemoveAlly(true)}
                />
              </div>
            )}

            {/* Block / Unblock */}
            <div className="flex-1">
              {isBlockedByMe ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-full"
                      disabled={isMutating}
                      onClick={() => unblockUser.mutate()}
                    >
                      <ShieldOff className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Unblock</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-full"
                      disabled={isMutating}
                      onClick={() => setConfirmBlock(true)}
                    >
                      <Ban className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Block</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Block {user.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  They won't be able to send you ally requests or direct
                  messages. Any existing ally relationship will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={blockUser.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={blockUser.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    blockUser.mutate(undefined, {
                      onSuccess: () => setConfirmBlock(false),
                    })
                  }}
                >
                  Block
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={confirmRemoveAlly}
            onOpenChange={setConfirmRemoveAlly}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove ally</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove{" "}
                  <span className="font-semibold text-foreground">
                    {user.name}
                  </span>{" "}
                  as an ally?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removeAlly.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={removeAlly.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    removeAlly.mutate(undefined, {
                      onSuccess: () => setConfirmRemoveAlly(false),
                    })
                  }}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

function AllyActionIconButton({
  allyStatus,
  allyRequestId,
  isMutating,
  onSendRequest,
  onAcceptRequest,
  onRemoveAlly,
}: {
  allyStatus: UserProfile["allyStatus"]
  allyRequestId: string | null
  isMutating: boolean
  onSendRequest: () => void
  onAcceptRequest: (requestId: string) => void
  onRemoveAlly: () => void
}) {
  switch (allyStatus) {
    case "none":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full"
              disabled={isMutating}
              onClick={onSendRequest}
            >
              <UserPlus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send Ally Request</TooltipContent>
        </Tooltip>
      )
    case "pending_outgoing":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full"
              disabled
            >
              <Clock className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ally Request Sent</TooltipContent>
        </Tooltip>
      )
    case "pending_incoming":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full"
              disabled={isMutating || !allyRequestId}
              onClick={() => allyRequestId && onAcceptRequest(allyRequestId)}
            >
              <Check className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Accept Ally Request</TooltipContent>
        </Tooltip>
      )
    case "allies":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full"
              disabled={isMutating}
              onClick={onRemoveAlly}
            >
              <UserMinus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove Ally</TooltipContent>
        </Tooltip>
      )
  }
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
