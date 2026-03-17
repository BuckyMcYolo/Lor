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
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { Copy, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

export function ManageInvitesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { guildSlug } = useParams({ strict: false })
  const queryClient = useQueryClient()
  const [revokeCode, setRevokeCode] = useState<string | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["guild-invites", guildSlug],
    queryFn: async () => {
      if (!guildSlug) throw new Error("Missing guild slug")
      const res = await apiClient.v1.guilds[":guildSlug"].invites.$get({
        param: { guildSlug },
      })
      if (!res.ok) throw new Error("Failed to fetch invites")
      return res.json()
    },
    enabled: open && !!guildSlug,
  })

  const revokeMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!guildSlug) throw new Error("Missing guild slug")
      const res = await apiClient.v1.guilds[":guildSlug"].invites[
        ":code"
      ].$delete({
        param: { guildSlug, code },
      })
      if (!res.ok) throw new Error("Failed to revoke invite")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["guild-invites", guildSlug],
      })
      toast.success("Invite revoked")
      setRevokeCode(null)
    },
    onError: () => {
      toast.error("Failed to revoke invite")
    },
  })

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invite/${code}`
      )
      toast.success("Invite link copied!")
    } catch {
      toast.error("Failed to copy")
    }
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return "Never"
    const date = new Date(expiresAt)
    const now = Date.now()
    const diff = date.getTime() - now
    if (diff <= 0) return "Expired"
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 24) return `${Math.floor(hours / 24)}d`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const invites = data?.invites ?? []

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Guild Invites</DialogTitle>
            <DialogDescription>
              View and manage active invite links.
            </DialogDescription>
          </DialogHeader>

          {isPending ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading invites...
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-sm text-destructive">
              Failed to load invites. Try closing and reopening.
            </div>
          ) : invites.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No active invites
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {invite.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {invite.uses}
                        {invite.maxUses !== null ? `/${invite.maxUses}` : ""}{" "}
                        uses
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {invite.inviter.name} — expires{" "}
                      {formatExpiry(invite.expiresAt)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Copy invite ${invite.code}`}
                      onClick={() => handleCopy(invite.code)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={`Revoke invite ${invite.code}`}
                      onClick={() => setRevokeCode(invite.code)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!revokeCode}
        onOpenChange={(open) => {
          if (!open) setRevokeCode(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate this invite link. Anyone with the
              link will no longer be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeCode && revokeMutation.mutate(revokeCode)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
