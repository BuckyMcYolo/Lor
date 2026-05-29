import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { sluggify } from "@repo/utils/slug"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Loader2, Plus, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Step = "choose" | "create" | "join"

function normalizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export function CreateGuildDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState<Step>("choose")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("choose")
      setName("")
      setSlug("")
      setSlugEdited(false)
      setInviteLink("")
      setError(null)
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (!slugEdited) {
      setSlug(sluggify(name))
    }
  }, [name, slugEdited])

  const getFirstChannelId = async (guildSlug: string) => {
    const channelsRes = await apiClient.v1.guilds[":guildSlug"].channels.$get({
      param: { guildSlug },
    })
    if (!channelsRes.ok) return null
    const channels = await channelsRes.json()
    if (channels.uncategorized[0]?.id) return channels.uncategorized[0].id
    for (const cat of channels.categories) {
      if (cat.channels[0]?.id) return cat.channels[0].id
    }
    return null
  }

  const handleCreate = async (e: React.FormEvent) => {
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
        const message = (res.error.message ?? "Failed to create guild").replace(
          /organization/gi,
          "Guild"
        )
        setError(message)
        return
      }

      const createdGuildSlug = res.data?.slug ?? normalizedSlug
      await queryClient.invalidateQueries({ queryKey: ["guilds"] })

      let firstChannelId: string | null = null
      try {
        firstChannelId = await getFirstChannelId(createdGuildSlug)
      } catch {}

      onOpenChange(false)

      if (firstChannelId) {
        navigate({
          to: "/$guildSlug/$channelId",
          params: { guildSlug: createdGuildSlug, channelId: firstChannelId },
        })
      } else {
        navigate({
          to: "/$guildSlug",
          params: { guildSlug: createdGuildSlug },
        })
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteLink.trim()) return
    setError(null)
    setLoading(true)

    const trimmed = inviteLink.trim()
    const inviteMatch = trimmed.match(
      /(?:^|\/)invite\/([A-Za-z0-9]+)(?:\/)?(?:[?#].*)?$/i
    )
    const inviteCode = /^[A-Za-z0-9]+$/.test(trimmed)
      ? trimmed
      : (inviteMatch?.[1] ?? null)

    if (!inviteCode) {
      setError("Enter a valid invite link or invite code.")
      setLoading(false)
      return
    }

    onOpenChange(false)
    await navigate({
      to: "/invite/$code",
      params: { code: inviteCode },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle>Add a Guild</DialogTitle>
              <DialogDescription>
                Create a new guild or join an existing one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("create")}
                className="group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Plus className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Create a Guild</p>
                  <p className="text-sm text-muted-foreground">
                    Start your own community from scratch
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStep("join")}
                className="group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Join an Existing Guild</p>
                  <p className="text-sm text-muted-foreground">
                    Enter an invite link to join a guild
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {step === "create" && (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("choose")
                setError(null)
              }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
            <DialogHeader>
              <DialogTitle>Create a Guild</DialogTitle>
              <DialogDescription>
                Give your community a name and a unique URL.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guild-name">Guild Name</Label>
                <Input
                  id="guild-name"
                  placeholder="My Awesome Guild"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guild-slug">Slug</Label>
                <div className="flex items-center rounded-md border border-input bg-muted px-3 text-sm focus-within:ring-1 focus-within:ring-ring">
                  <span className="shrink-0 text-muted-foreground">
                    lor.chat/
                  </span>
                  <Input
                    id="guild-slug"
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                    placeholder="my-awesome-guild"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true)
                      setSlug(normalizeSlugInput(e.target.value))
                    }}
                    onBlur={() =>
                      setSlug((currentSlug) => sluggify(currentSlug))
                    }
                    disabled={loading}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !name.trim() || !sluggify(slug)}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Guild
              </Button>
            </form>
          </>
        )}

        {step === "join" && (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("choose")
                setError(null)
              }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
            <DialogHeader>
              <DialogTitle>Join a Guild</DialogTitle>
              <DialogDescription>
                Paste an invite link or code to join an existing guild.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-link">Invite Link or Code</Label>
                <Input
                  id="invite-link"
                  placeholder="https://app.lor.chat/invite/abc123 or abc123"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !inviteLink.trim()}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Join Guild
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
