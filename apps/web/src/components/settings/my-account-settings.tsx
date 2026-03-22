import { authClient } from "@repo/auth/client"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { Separator } from "@repo/ui/components/separator"
import { Textarea } from "@repo/ui/components/textarea"
import { cn } from "@repo/ui/lib/utils"
import { Camera, Check, Loader2, Upload, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

const MAX_BIO_LENGTH = 255
const MAX_STATUS_LENGTH = 128
const MAX_USERNAME_LENGTH = 30
const MIN_USERNAME_LENGTH = 3
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]

function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, GIF, and WebP images are allowed"
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Avatar must be under 2 MB"
  }
  return null
}

export function MyAccountSettings() {
  const { data: session } = authClient.useSession()
  const user = session?.user

  const [name, setName] = useState("")
  const [displayUsername, setDisplayUsername] = useState("")
  const [bio, setBio] = useState("")
  const [status, setStatus] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [usernameAvailability, setUsernameAvailability] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCountRef = useRef(0)
  const avatarPreviewRef = useRef<string | null>(null)
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    setName(user.name ?? "")
    setDisplayUsername(user.displayUsername ?? user.username ?? "")
    setBio((user.bio as string) ?? "")
    setStatus((user.status as string) ?? "")
  }, [user])

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current)
        URL.revokeObjectURL(avatarPreviewRef.current)
    }
  }, [])

  const originalUsername = user?.displayUsername ?? user?.username ?? ""
  const usernameChanged = displayUsername.trim() !== originalUsername

  const handleUsernameChange = useCallback(
    (value: string) => {
      setDisplayUsername(value)

      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current)

      const trimmed = value.trim()
      const currentOriginal =
        session?.user?.displayUsername ?? session?.user?.username ?? ""

      if (!trimmed || trimmed === currentOriginal) {
        setUsernameAvailability("idle")
        return
      }

      if (trimmed.length < MIN_USERNAME_LENGTH) {
        setUsernameAvailability("invalid")
        return
      }

      if (!USERNAME_REGEX.test(trimmed)) {
        setUsernameAvailability("invalid")
        return
      }

      setUsernameAvailability("checking")
      usernameCheckTimer.current = setTimeout(async () => {
        try {
          const { data } = await authClient.isUsernameAvailable({
            username: trimmed,
          })
          setUsernameAvailability(data?.available ? "available" : "taken")
        } catch {
          setUsernameAvailability("idle")
        }
      }, 500)
    },
    [session?.user?.displayUsername, session?.user?.username]
  )

  const setAvatarFromFile = useCallback((file: File) => {
    const error = validateAvatarFile(file)
    if (error) {
      toast.error(error)
      return
    }
    setAvatarFile(file)
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    const url = URL.createObjectURL(file)
    avatarPreviewRef.current = url
    setAvatarPreview(url)
  }, [])

  const handleAvatarSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) setAvatarFromFile(file)
    },
    [setAvatarFromFile]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current += 1
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current -= 1
    if (dragCountRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCountRef.current = 0
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) setAvatarFromFile(file)
    },
    [setAvatarFromFile]
  )

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    const res = await apiClient.v1.uploads.avatar.presign.$post({
      json: {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      },
    })

    if (!res.ok) {
      throw new Error("Failed to get upload URL")
    }

    const { uploadUrl, fileUrl } = await res.json()

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    })

    if (!uploadRes.ok) {
      throw new Error("Failed to upload avatar")
    }

    return fileUrl
  }, [])

  const handleSave = useCallback(async () => {
    if (!user) return
    setIsSaving(true)

    try {
      let imageUrl = user.image

      if (avatarFile) {
        imageUrl = await uploadAvatar(avatarFile)
      }

      await authClient.updateUser({
        name: name.trim(),
        image: imageUrl ?? undefined,
        bio: bio.trim() || undefined,
        status: status.trim() || undefined,
        ...(usernameChanged && displayUsername.trim()
          ? { username: displayUsername.trim() }
          : {}),
      })

      setAvatarFile(null)
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
        avatarPreviewRef.current = null
        setAvatarPreview(null)
      }

      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }, [
    user,
    name,
    displayUsername,
    usernameChanged,
    bio,
    status,
    avatarFile,
    avatarPreview,
    uploadAvatar,
  ])

  const hasChanges =
    user &&
    (name.trim() !== (user.name ?? "") ||
      usernameChanged ||
      bio.trim() !== ((user.bio as string) ?? "") ||
      status.trim() !== ((user.status as string) ?? "") ||
      avatarFile !== null)

  const isUsernameValid =
    !usernameChanged ||
    usernameAvailability === "available" ||
    usernameAvailability === "idle"

  const isValid = name.trim().length > 0 && isUsernameValid

  if (!user) return null

  const displayAvatar = avatarPreview ?? user.image
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone for avatar upload */}
      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border-2 border-dashed p-4 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-transparent"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className="group relative shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar className="size-20">
            {displayAvatar && (
              <AvatarImage src={displayAvatar} alt={user.name} />
            )}
            <AvatarFallback className="text-lg font-semibold">
              {initials ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">
            {(user.displayUsername ?? user.username)
              ? `@${user.displayUsername ?? user.username}`
              : user.email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change avatar
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="size-3" />
              or drag & drop
            </span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              value={displayUsername}
              onChange={(e) => handleUsernameChange(e.target.value)}
              maxLength={MAX_USERNAME_LENGTH}
              placeholder="your_username"
            />
            {usernameChanged && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                {usernameAvailability === "checking" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {usernameAvailability === "available" && (
                  <Check className="size-4 text-emerald-500" />
                )}
                {usernameAvailability === "taken" && (
                  <X className="size-4 text-destructive" />
                )}
                {usernameAvailability === "invalid" && (
                  <X className="size-4 text-destructive" />
                )}
              </div>
            )}
          </div>
          {usernameChanged && usernameAvailability === "taken" && (
            <p className="text-xs text-destructive">
              Username is already taken
            </p>
          )}
          {usernameChanged && usernameAvailability === "invalid" && (
            <p className="text-xs text-destructive">
              {displayUsername.trim().length < MIN_USERNAME_LENGTH
                ? `Username must be at least ${MIN_USERNAME_LENGTH} characters`
                : "Only letters, numbers, underscores, and dots allowed"}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} disabled />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="status">Status</Label>
            <span className="text-xs text-muted-foreground">
              {status.length}/{MAX_STATUS_LENGTH}
            </span>
          </div>
          <Input
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="What are you up to?"
            maxLength={MAX_STATUS_LENGTH}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className="text-xs text-muted-foreground">
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            maxLength={MAX_BIO_LENGTH}
            className="min-h-20 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || !isValid || isSaving}
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
