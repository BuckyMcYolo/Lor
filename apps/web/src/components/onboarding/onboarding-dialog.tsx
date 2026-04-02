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
import { cn } from "@repo/ui/lib/utils"
import { sluggify } from "@repo/utils/slug"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Check, Loader2, Plus, Users, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Step = "username" | "welcome" | "create" | "join"

const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 30
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/

function normalizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function parseInviteCode(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^[A-Za-z0-9]+$/.test(trimmed)) {
    return trimmed
  }

  const inviteMatch = trimmed.match(
    /(?:^|\/)invite\/([A-Za-z0-9]+)(?:\/)?(?:[?#].*)?$/i
  )

  return inviteMatch?.[1] ?? null
}

export function OnboardingDialog({ open }: { open: boolean }) {
  const { data: session } = authClient.useSession()
  const hasUsername = !!(
    session?.user?.username &&
    session.user.username.length >= MIN_USERNAME_LENGTH
  )
  const [step, setStep] = useState<Step>(hasUsername ? "welcome" : "username")
  // Sync step with session hydration — session may be null on first render
  useEffect(() => {
    if (hasUsername && step === "username") {
      setStep("welcome")
    }
  }, [hasUsername, step])
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Username step state
  const [username, setUsername] = useState("")
  const [usernameAvailability, setUsernameAvailability] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle")
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current)
    }
  }, [])

  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value)
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current)

    const trimmed = value.trim()
    if (!trimmed) {
      setUsernameAvailability("idle")
      return
    }
    if (
      trimmed.length < MIN_USERNAME_LENGTH ||
      trimmed.length > MAX_USERNAME_LENGTH ||
      !USERNAME_REGEX.test(trimmed)
    ) {
      setUsernameAvailability("invalid")
      return
    }

    setUsernameAvailability("checking")
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const { data } = await authClient.isUsernameAvailable({
          username: trimmed,
        })
        setUsernameAvailability((prev) =>
          prev === "checking" ? (data?.available ? "available" : "taken") : prev
        )
      } catch {
        setUsernameAvailability((prev) => (prev === "checking" ? "idle" : prev))
      }
    }, 500)
  }, [])

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed || usernameAvailability !== "available") return
    setError(null)
    setLoading(true)
    try {
      const { error } = await authClient.updateUser({
        username: trimmed,
        displayUsername: trimmed,
      })
      if (error) {
        setError(error.message ?? "Failed to set username")
        return
      }
      setStep("welcome")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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
    return (
      channels.uncategorized[0]?.id ??
      channels.categories[0]?.channels[0]?.id ??
      null
    )
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
      } catch (error) {
        console.error(
          `Failed to fetch first channel for guild ${createdGuildSlug}:`,
          error
        )
      }

      if (firstChannelId) {
        navigate({
          to: "/$guildSlug/$channelId",
          params: { guildSlug: createdGuildSlug, channelId: firstChannelId },
        })
        return
      }

      navigate({ to: "/$guildSlug", params: { guildSlug: createdGuildSlug } })
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

    const inviteCode = parseInviteCode(inviteLink)

    if (!inviteCode) {
      setError("Enter a valid invite link or invite code.")
      setLoading(false)
      return
    }

    await navigate({
      to: "/invite/$code",
      params: { code: inviteCode },
    })
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
            {step === "username" && (
              <>
                <DialogHeader className="mb-6 text-left">
                  <DialogTitle className="text-2xl">
                    Choose a username
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Pick a unique username for your Townhall identity.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSetUsername} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="onboard-username">Username</Label>
                    <div className="relative">
                      <Input
                        id="onboard-username"
                        placeholder="coolname"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        disabled={loading}
                        autoFocus
                        className={cn(
                          "pr-9",
                          usernameAvailability === "available" &&
                            "border-green-500 focus-visible:ring-green-500/50",
                          (usernameAvailability === "taken" ||
                            usernameAvailability === "invalid") &&
                            "border-destructive focus-visible:ring-destructive/50"
                        )}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameAvailability === "checking" && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                        {usernameAvailability === "available" && (
                          <Check className="size-4 text-green-500" />
                        )}
                        {usernameAvailability === "taken" && (
                          <X className="size-4 text-destructive" />
                        )}
                        {usernameAvailability === "invalid" && (
                          <X className="size-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      3–30 characters. Letters, numbers, underscores, and
                      periods only.
                    </p>
                    {usernameAvailability === "taken" && (
                      <p className="text-xs text-destructive">
                        That username is already taken.
                      </p>
                    )}
                    {usernameAvailability === "invalid" &&
                      username.trim().length > 0 && (
                        <p className="text-xs text-destructive">
                          Username must be 3–30 characters using only letters,
                          numbers, underscores, and periods.
                        </p>
                      )}
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || usernameAvailability !== "available"}
                  >
                    {loading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Continue
                  </Button>
                </form>
              </>
            )}

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
                    <div className="flex items-center rounded-md border border-input bg-muted px-3 text-sm focus-within:ring-1 focus-within:ring-ring">
                      <span className="shrink-0 text-muted-foreground">
                        townhall.chat/
                      </span>
                      <Input
                        id="guild-slug"
                        className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
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
                    Paste an invite link or code to join an existing guild.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-link">Invite Link or Code</Label>
                    <Input
                      id="invite-link"
                      placeholder="https://app.townhall.chat/invite/abc123 or abc123"
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
