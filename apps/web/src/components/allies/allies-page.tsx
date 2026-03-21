import { Badge } from "@repo/ui/components/badge"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  MessageCircle,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useCreateDM } from "@/hooks/use-create-dm"
import { apiClient } from "@/lib/api-client"
import type { Ally, AllyRequest } from "@/lib/api-types"

type Tab = "all" | "pending"

function AlliesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div key={i} className="flex items-center gap-3 px-4 py-2">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AllyRow({
  ally,
  onMessage,
  onRemove,
  isRemoving,
}: {
  ally: Ally
  onMessage: (userId: string) => void
  onRemove: (userId: string) => void
  isRemoving: boolean
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-foreground/[0.04]">
      <UserAvatar name={ally.name} src={ally.image} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{ally.name}</div>
        {ally.username && (
          <div className="truncate text-xs text-muted-foreground">
            @{ally.displayUsername ?? ally.username}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Send DM"
          onClick={() => onMessage(ally.id)}
        >
          <MessageCircle className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          title="Remove ally"
          onClick={() => onRemove(ally.id)}
          disabled={isRemoving}
        >
          <UserMinus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function IncomingRequestRow({
  request,
  onAccept,
  onDecline,
  isPending,
}: {
  request: AllyRequest
  onAccept: (requestId: string) => void
  onDecline: (requestId: string) => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-foreground/[0.04]">
      <UserAvatar name={request.sender.name} src={request.sender.image} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {request.sender.name}
        </div>
        {request.sender.username && (
          <div className="truncate text-xs text-muted-foreground">
            @{request.sender.displayUsername ?? request.sender.username}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-emerald-500 hover:text-emerald-500"
          title="Accept"
          onClick={() => onAccept(request.id)}
          disabled={isPending}
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          title="Decline"
          onClick={() => onDecline(request.id)}
          disabled={isPending}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function OutgoingRequestRow({ request }: { request: AllyRequest }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-foreground/[0.04]">
      <UserAvatar name={request.receiver.name} src={request.receiver.image} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {request.receiver.name}
        </div>
        {request.receiver.username && (
          <div className="truncate text-xs text-muted-foreground">
            @{request.receiver.displayUsername ?? request.receiver.username}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">Pending</span>
    </div>
  )
}

export function AlliesPage() {
  const queryClient = useQueryClient()
  const createDM = useCreateDM()
  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [addUsername, setAddUsername] = useState("")

  const {
    data: allies,
    isPending: alliesLoading,
    isError: alliesError,
  } = useQuery({
    queryKey: ["allies"],
    queryFn: async () => {
      const res = await apiClient.v1.allies.$get()
      if (!res.ok) throw new Error("Failed to fetch allies")
      return res.json()
    },
  })

  const {
    data: requests,
    isPending: requestsLoading,
    isError: requestsError,
  } = useQuery({
    queryKey: ["ally-requests"],
    queryFn: async () => {
      const res = await apiClient.v1.allies.requests.$get()
      if (!res.ok) throw new Error("Failed to fetch ally requests")
      return res.json()
    },
  })

  const [removingAllyId, setRemovingAllyId] = useState<string | null>(null)

  const invalidate = (affectedUserId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["allies"] })
    void queryClient.invalidateQueries({ queryKey: ["ally-requests"] })
    if (affectedUserId) {
      void queryClient.invalidateQueries({
        queryKey: ["user-profile", affectedUserId],
      })
    }
  }

  const sendRequest = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.v1.allies.requests.$post({
        json: { userId },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(
          "message" in body ? body.message : "Failed to send ally request"
        )
      }
      return { data: await res.json(), targetUserId: userId }
    },
    onSuccess: ({ targetUserId }) => {
      invalidate(targetUserId)
      setAddUsername("")
      toast.success("Ally request sent")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const acceptRequest = useMutation({
    mutationFn: async ({
      requestId,
      senderId,
    }: {
      requestId: string
      senderId: string
    }) => {
      const res = await apiClient.v1.allies.requests[":requestId"].accept.$post(
        {
          param: { requestId },
        }
      )
      if (!res.ok) throw new Error("Failed to accept request")
      return { data: await res.json(), senderId }
    },
    onSuccess: ({ senderId }) => {
      invalidate(senderId)
      toast.success("Ally request accepted")
    },
    onError: () => {
      toast.error("Failed to accept request")
    },
  })

  const declineRequest = useMutation({
    mutationFn: async ({
      requestId,
      senderId,
    }: {
      requestId: string
      senderId: string
    }) => {
      const res = await apiClient.v1.allies.requests[
        ":requestId"
      ].decline.$post({
        param: { requestId },
      })
      if (!res.ok) throw new Error("Failed to decline request")
      return { senderId }
    },
    onSuccess: ({ senderId }) => {
      invalidate(senderId)
      toast.success("Ally request declined")
    },
    onError: () => {
      toast.error("Failed to decline request")
    },
  })

  const removeAlly = useMutation({
    mutationFn: async (userId: string) => {
      setRemovingAllyId(userId)
      const res = await apiClient.v1.allies[":userId"].$delete({
        param: { userId },
      })
      if (!res.ok) throw new Error("Failed to remove ally")
      return userId
    },
    onSuccess: (userId) => {
      setRemovingAllyId(null)
      invalidate(userId)
      toast.success("Ally removed")
    },
    onError: () => {
      setRemovingAllyId(null)
      toast.error("Failed to remove ally")
    },
  })

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = addUsername.trim()
    if (!trimmed) return
    // The input is a userId for now — we can enhance to support username lookup later
    sendRequest.mutate(trimmed)
  }

  const filteredAllies = (allies?.allies ?? []).filter((ally) =>
    ally.name.toLowerCase().includes(search.toLowerCase())
  )

  const incomingRequests = requests?.incoming ?? []
  const outgoingRequests = requests?.outgoing ?? []
  const pendingCount = incomingRequests.length + outgoingRequests.length

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <Users className="size-5 text-muted-foreground" />
        <h1 className="text-base font-semibold">Allies</h1>
        <div className="mx-2 h-5 w-px bg-border" />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              tab === "all"
                ? "bg-foreground/[0.08] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
              tab === "pending"
                ? "bg-foreground/[0.08] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pending
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="h-4 min-w-4 px-1 text-[10px]"
              >
                {pendingCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto w-full max-w-2xl py-4">
          {tab === "all" && (
            <>
              {/* Search */}
              <div className="relative px-4 pb-4">
                <Search className="absolute top-2.5 left-7 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search allies"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {alliesLoading ? (
                <AlliesSkeleton />
              ) : alliesError ? (
                <div className="px-4 py-8 text-center text-sm text-destructive">
                  Failed to load allies.
                </div>
              ) : filteredAllies.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {search
                    ? "No allies match your search."
                    : "You don't have any allies yet. Send an ally request to get started."}
                </div>
              ) : (
                <div>
                  <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    All Allies - {filteredAllies.length}
                  </div>
                  {filteredAllies.map((ally) => (
                    <AllyRow
                      key={ally.id}
                      ally={ally}
                      onMessage={(userId) => createDM.mutate([userId])}
                      onRemove={(userId) => removeAlly.mutate(userId)}
                      isRemoving={removingAllyId === ally.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "pending" && (
            <>
              {/* Add Ally form */}
              <form onSubmit={handleSendRequest} className="px-4 pb-4">
                <label
                  htmlFor="add-ally-input"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Add Ally
                </label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Enter a user ID to send an ally request.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="add-ally-input"
                    placeholder="User ID"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!addUsername.trim() || sendRequest.isPending}
                  >
                    <UserPlus className="mr-1.5 size-4" />
                    Send Request
                  </Button>
                </div>
              </form>

              {requestsLoading ? (
                <AlliesSkeleton />
              ) : requestsError ? (
                <div className="px-4 py-8 text-center text-sm text-destructive">
                  Failed to load requests.
                </div>
              ) : (
                <>
                  {incomingRequests.length > 0 && (
                    <div className="mb-4">
                      <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Incoming - {incomingRequests.length}
                      </div>
                      {incomingRequests.map((request) => (
                        <IncomingRequestRow
                          key={request.id}
                          request={request}
                          onAccept={(id) =>
                            acceptRequest.mutate({
                              requestId: id,
                              senderId: request.sender.id,
                            })
                          }
                          onDecline={(id) =>
                            declineRequest.mutate({
                              requestId: id,
                              senderId: request.sender.id,
                            })
                          }
                          isPending={
                            acceptRequest.isPending || declineRequest.isPending
                          }
                        />
                      ))}
                    </div>
                  )}

                  {outgoingRequests.length > 0 && (
                    <div className="mb-4">
                      <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Outgoing - {outgoingRequests.length}
                      </div>
                      {outgoingRequests.map((request) => (
                        <OutgoingRequestRow
                          key={request.id}
                          request={request}
                        />
                      ))}
                    </div>
                  )}

                  {incomingRequests.length === 0 &&
                    outgoingRequests.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No pending ally requests.
                      </div>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
