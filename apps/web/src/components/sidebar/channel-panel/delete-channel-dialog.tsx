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
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { apiClient } from "@/lib/api-client"
import type { Channel } from "@/lib/api-types"

export function DeleteChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { workspaceSlug, channelId: activeChannelId } = useParams({
    strict: false,
  })
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].channels[
        ":channelId"
      ].$delete({
        param: {
          workspaceSlug: workspaceSlug as string,
          channelId: channel.id,
        },
      })
      if (!res.ok) {
        throw new Error("Failed to delete channel")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceSlug] })
      onOpenChange(false)

      // If we deleted the active channel, navigate to workspace root
      if (activeChannelId === channel.id) {
        navigate({
          to: "/$workspaceSlug",
          params: { workspaceSlug: workspaceSlug as string },
        })
      }
    },
  })

  const isCategory = channel.type === "category"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCategory ? "Delete Category" : "Delete Channel"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCategory ? (
              <>
                Are you sure you want to delete the{" "}
                <span className="font-semibold">{channel.name}</span> category?
                Channels inside it will become uncategorized. This action cannot
                be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-semibold">#{channel.name}</span>? This
                will permanently delete all messages in this channel. This
                action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            variant="destructive"
          >
            {isCategory ? "Delete Category" : "Delete Channel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
