import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { cn } from "@repo/ui/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { Camera, Loader2, Upload } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

const MAX_GUILD_ICON_BYTES = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]

function validateIconFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, and SVG images are allowed"
  }
  if (file.size > MAX_GUILD_ICON_BYTES) {
    return "Icon must be under 2 MB"
  }
  return null
}

type Guild = {
  id: string
  name: string
  slug: string
  logo?: string | null
}

export function GuildSettingsDialog({
  open,
  onOpenChange,
  guild,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guild: Guild
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(guild.name)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iconPreviewRef = useRef<string | null>(null)
  const dragCountRef = useRef(0)

  useEffect(() => {
    setName(guild.name)
    setIconFile(null)
    if (iconPreviewRef.current) {
      URL.revokeObjectURL(iconPreviewRef.current)
      iconPreviewRef.current = null
    }
    setIconPreview(null)
  }, [guild, open])

  useEffect(() => {
    return () => {
      if (iconPreviewRef.current) URL.revokeObjectURL(iconPreviewRef.current)
    }
  }, [])

  const setIconFromFile = useCallback((file: File) => {
    const error = validateIconFile(file)
    if (error) {
      toast.error(error)
      return
    }
    setIconFile(file)
    if (iconPreviewRef.current) URL.revokeObjectURL(iconPreviewRef.current)
    const url = URL.createObjectURL(file)
    iconPreviewRef.current = url
    setIconPreview(url)
  }, [])

  const handleIconSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) setIconFromFile(file)
    },
    [setIconFromFile]
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
    if (dragCountRef.current === 0) setIsDragging(false)
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
      if (file) setIconFromFile(file)
    },
    [setIconFromFile]
  )

  const uploadIcon = useCallback(
    async (file: File): Promise<string> => {
      const res = await apiClient.v1.uploads["guild-icon"].presign.$post({
        json: {
          guildId: guild.id,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        },
      })

      if (!res.ok) throw new Error("Failed to get upload URL")

      const { uploadUrl, fileUrl } = await res.json()

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Failed to upload icon")

      return fileUrl
    },
    [guild.id]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      let logoUrl: string | null | undefined
      if (iconFile) {
        logoUrl = await uploadIcon(iconFile)
      }

      const res = await apiClient.v1.guilds[":guildSlug"].$patch({
        param: { guildSlug: guild.slug },
        json: {
          ...(name.trim() !== guild.name ? { name: name.trim() } : {}),
          ...(logoUrl !== undefined ? { logo: logoUrl } : {}),
        },
      })

      if (!res.ok) throw new Error("Failed to update guild")

      setIconFile(null)
      if (iconPreview) {
        URL.revokeObjectURL(iconPreview)
        iconPreviewRef.current = null
        setIconPreview(null)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["guilds"] }),
        queryClient.invalidateQueries({ queryKey: ["active-guild"] }),
      ])

      toast.success("Guild updated")
      onOpenChange(false)
    } catch {
      toast.error("Failed to update guild")
    } finally {
      setIsSaving(false)
    }
  }, [
    guild,
    name,
    iconFile,
    iconPreview,
    uploadIcon,
    queryClient,
    onOpenChange,
  ])

  const hasChanges = name.trim() !== guild.name || iconFile !== null
  const isValid = name.trim().length > 0

  const displayIcon = iconPreview ?? guild.logo
  const initials = guild.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guild Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone for icon upload */}
          <div
            className={cn(
              "flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-6 transition-colors",
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
                {displayIcon && (
                  <AvatarImage src={displayIcon} alt={guild.name} />
                )}
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleIconSelect}
              />
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change icon
              </Button>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Upload className="size-3" />
                or drag & drop
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guild-name">Guild Name</Label>
            <Input
              id="guild-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="My Awesome Guild"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !isValid || isSaving}
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
