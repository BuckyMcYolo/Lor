"use client"

import { authClient } from "@repo/auth/client"
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
import { sluggify } from "@repo/utils/slug"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

async function getFirstChannelId(workspaceSlug: string) {
  const res = await apiClient.v1.workspaces[":workspaceSlug"].channels.$get({
    param: { workspaceSlug },
  })
  if (!res.ok) return null
  const channels = await res.json()
  if (channels.uncategorized[0]?.id) return channels.uncategorized[0].id
  for (const cat of channels.categories) {
    if (cat.channels[0]?.id) return cat.channels[0].id
  }
  return null
}

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: CreateWorkspaceDialogProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setName("")
      setSlug("")
      setSlugEdited(false)
      setError(null)
      setLoading(false)
    }
  }, [open])

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugEdited) setSlug(sluggify(value))
  }

  const handleSlugChange = (value: string) => {
    setSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    )
    setSlugEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedSlug = sluggify(slug)
    if (!name.trim() || !normalizedSlug) return
    setError(null)
    setLoading(true)

    try {
      const res = await authClient.organization.create({
        name: name.trim(),
        slug: normalizedSlug,
      })

      if (res.error) {
        const message = (
          res.error.message ?? "Failed to create workspace"
        ).replace(/organization/gi, "Workspace")
        setError(message)
        return
      }

      const createdSlug = res.data?.slug ?? normalizedSlug
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })

      let firstChannelId: string | null = null
      try {
        firstChannelId = await getFirstChannelId(createdSlug)
      } catch (err) {
        console.error("Failed to fetch first channel:", err)
      }

      onOpenChange(false)

      if (firstChannelId) {
        navigate({
          to: "/$workspaceSlug/$channelId",
          params: { workspaceSlug: createdSlug, channelId: firstChannelId },
        })
        return
      }
      navigate({
        to: "/$workspaceSlug",
        params: { workspaceSlug: createdSlug },
      })
    } catch {
      setError("Failed to create workspace")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!name.trim() && !!sluggify(slug) && !loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>
            Workspaces are where your team's channels, messages, and shared
            memory live.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Inc."
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-slug">URL slug</Label>
            <Input
              id="workspace-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
