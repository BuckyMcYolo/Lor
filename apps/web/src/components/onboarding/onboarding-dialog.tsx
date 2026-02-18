"use client"

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
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Loader2, Plus, Users } from "lucide-react"
import { useEffect, useState } from "react"

type Step = "welcome" | "create" | "join"

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
}

export function OnboardingDialog({ open }: { open: boolean }) {
  const [step, setStep] = useState<Step>("welcome")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (!slugEdited) {
      setSlug(toSlug(name))
    }
  }, [name, slugEdited])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setError(null)
    setLoading(true)

    try {
      const res = await authClient.organization.create({
        name: name.trim(),
        slug: slug.trim(),
      })

      if (res.error) {
        setError(res.error.message ?? "Failed to create guild")
        setLoading(false)
        return
      }

      await authClient.updateUser({ onboardingCompleted: true })
      await queryClient.invalidateQueries({ queryKey: ["guilds"] })
      navigate({ to: "/$guildSlug", params: { guildSlug: slug.trim() } })
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteLink.trim()) return
    setError(null)
    setLoading(true)
    // TODO: implement join via invite link API
    setError("Joining via invite link is not yet supported.")
    setLoading(false)
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="flex min-h-[460px]">
          {/* Left decorative panel */}
          <div className="relative hidden w-[220px] shrink-0 overflow-hidden sm:block">
            <img
              src="/townhall-onboarding2.png"
              alt="A medieval campsite at night"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right content panel */}
          <div className="flex flex-1 flex-col justify-center p-8">
            {step === "welcome" && (
              <>
                <DialogHeader className="mb-8 text-left">
                  <DialogTitle className="text-2xl">
                    Welcome to Townhall
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Get started by creating a new guild or joining one you've
                    been invited to.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
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
                    setStep("welcome")
                    setError(null)
                  }}
                  className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>

                <DialogHeader className="mb-6 text-left">
                  <DialogTitle className="text-2xl">Create a Guild</DialogTitle>
                  <DialogDescription className="text-sm">
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
                    <div className="flex items-center rounded-md border border-input bg-muted px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring">
                      <span className="shrink-0 text-muted-foreground">
                        townhall.gg/
                      </span>
                      <input
                        id="guild-slug"
                        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder="my-awesome-guild"
                        value={slug}
                        onChange={(e) => {
                          setSlugEdited(true)
                          setSlug(toSlug(e.target.value))
                        }}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !name.trim() || !slug.trim()}
                  >
                    {loading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
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
                    setStep("welcome")
                    setError(null)
                  }}
                  className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>

                <DialogHeader className="mb-6 text-left">
                  <DialogTitle className="text-2xl">Join a Guild</DialogTitle>
                  <DialogDescription className="text-sm">
                    Paste an invite link to join an existing guild.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-link">Invite Link</Label>
                    <Input
                      id="invite-link"
                      placeholder="https://townhall.gg/invite/abc123"
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
                    {loading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Join Guild
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
