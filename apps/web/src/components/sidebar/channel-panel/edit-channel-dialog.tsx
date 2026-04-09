import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { Textarea } from "@repo/ui/components/textarea"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import type { Channel } from "@/lib/api-types"

export function EditChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { guildSlug } = useParams({ strict: false })
  const queryClient = useQueryClient()

  const [name, setName] = useState(channel.name ?? "")
  const [topic, setTopic] = useState(channel.topic ?? "")

  useEffect(() => {
    if (open) {
      setName(channel.name ?? "")
      setTopic(channel.topic ?? "")
    }
  }, [open, channel.name, channel.topic])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!guildSlug) {
        throw new Error("Missing guild slug")
      }

      const validatedGuildSlug = guildSlug
      const res = await apiClient.v1.guilds[":guildSlug"].channels[
        ":channelId"
      ].$patch({
        param: { guildSlug: validatedGuildSlug, channelId: channel.id },
        json: {
          name,
          ...(channel.type !== "category" ? { topic: topic || undefined } : {}),
        },
      })
      if (!res.ok) {
        const label = channel.type === "category" ? "category" : "channel"
        let message = `Failed to update ${label}`
        const responseText = await res.text()

        if (responseText) {
          try {
            const parsed = JSON.parse(responseText) as { message?: string }
            message =
              typeof parsed.message === "string" ? parsed.message : responseText
          } catch {
            message = responseText
          }
        }

        throw new Error(message)
      }
      return {
        guildSlug: validatedGuildSlug,
        channel: await res.json(),
      }
    },
    onSuccess: ({ guildSlug: validatedGuildSlug }) => {
      queryClient.invalidateQueries({
        queryKey: ["channels", validatedGuildSlug],
      })
      queryClient.invalidateQueries({
        queryKey: ["channel", validatedGuildSlug, channel.id],
      })
      onOpenChange(false)
    },
    onError: (error) => {
      const label = channel.type === "category" ? "category" : "channel"
      toast.error(
        error instanceof Error ? error.message : `Failed to update ${label}`
      )
    },
  })

  const hasChanges =
    name !== (channel.name ?? "") ||
    (channel.type !== "category" && topic !== (channel.topic ?? ""))
  const isValid = name.trim().length > 0

  const isCategory = channel.type === "category"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCategory ? "Edit Category" : "Edit Channel"}
          </DialogTitle>
          <DialogDescription>
            {isCategory
              ? "Update the category name."
              : "Update the channel name and topic."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (hasChanges && isValid) {
              updateMutation.mutate()
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          {!isCategory && (
            <div className="space-y-2">
              <Label htmlFor="channel-topic">Topic</Label>
              <Textarea
                id="channel-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={1024}
                placeholder="What's this channel about?"
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || !isValid || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
