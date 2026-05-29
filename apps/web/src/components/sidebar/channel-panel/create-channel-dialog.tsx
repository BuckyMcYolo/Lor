import { Button } from "@repo/ui/components/button"
import { CustomSelectItem } from "@repo/ui/components/custom-select-item"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Loader2, Scroll, Volume2 } from "lucide-react"
import { useState } from "react"
import { apiClient } from "@/lib/api-client"

const channelTypes = [
  {
    value: "text",
    label: "Text",
    icon: Scroll,
    description: "A text channel for general conversation and discussion",
  },
  {
    value: "voice",
    label: "Voice",
    icon: Volume2,
    description: "A voice channel for huddles and meetings",
  },
] as const

export function CreateChannelDialog({
  open,
  onOpenChange,
  parentId,
  forceType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: string | null
  forceType?: "category"
}) {
  const { guildSlug } = useParams({ strict: false })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [type, setType] = useState<"text" | "voice">("text")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !guildSlug) return
    if (forceType !== "category" && !normalizedName) return
    setError(null)
    setLoading(true)

    const isCategory = forceType === "category"

    try {
      const res = await apiClient.v1.guilds[":guildSlug"].channels.$post({
        param: { guildSlug },
        json: {
          name: isCategory ? trimmed : normalizedName,
          type: isCategory ? "category" : type,
          ...(parentId && !isCategory ? { parentId } : {}),
        },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(
          (data as { message?: string } | null)?.message ??
            `Failed to create ${isCategory ? "category" : "channel"}`
        )
        return
      }

      const channel = await res.json()
      await queryClient.invalidateQueries({
        queryKey: ["channels", guildSlug],
      })
      onOpenChange(false)
      setName("")
      setType("text")
      setError(null)

      if (!isCategory) {
        navigate({
          to: "/$guildSlug/$channelId",
          params: { guildSlug, channelId: channel.id },
        })
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("")
      setType("text")
      setError(null)
    }
    onOpenChange(open)
  }

  const isCategory = forceType === "category"

  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCategory ? "Create Category" : "Create Channel"}
          </DialogTitle>
          <DialogDescription>
            {isCategory
              ? "Add a new category to organize your channels."
              : "Add a new channel to your guild."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          {!isCategory && (
            <div className="space-y-1.5">
              <Label htmlFor="channel-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "text" | "voice")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channelTypes.map((ct) => (
                    <CustomSelectItem
                      key={ct.value}
                      value={ct.value}
                      tooltip={ct.description}
                      side="right"
                    >
                      <div className="flex items-center gap-2">
                        <ct.icon className="size-4 text-muted-foreground" />
                        {ct.label}
                      </div>
                    </CustomSelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              placeholder={isCategory ? "Community" : "general"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
            {!isCategory &&
              normalizedName &&
              normalizedName !== name.trim() && (
                <p className="text-xs text-muted-foreground">
                  Will be created as{" "}
                  <span className="font-mono">#{normalizedName}</span>
                </p>
              )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={
              loading || !name.trim() || (!isCategory && !normalizedName)
            }
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isCategory ? "Create Category" : "Create Channel"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
