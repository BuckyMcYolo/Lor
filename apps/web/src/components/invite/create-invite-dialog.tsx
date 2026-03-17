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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import { useMutation } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { Check, Copy, Link } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

const EXPIRY_OPTIONS = [
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
  { label: "6 hours", value: "360" },
  { label: "12 hours", value: "720" },
  { label: "1 day", value: "1440" },
  { label: "7 days", value: "10080" },
  { label: "Never", value: "never" },
]

const MAX_USES_OPTIONS = [
  { label: "No limit", value: "none" },
  { label: "1 use", value: "1" },
  { label: "5 uses", value: "5" },
  { label: "10 uses", value: "10" },
  { label: "25 uses", value: "25" },
  { label: "50 uses", value: "50" },
  { label: "100 uses", value: "100" },
]

export function CreateInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { guildSlug } = useParams({ strict: false })
  const [expiresIn, setExpiresIn] = useState("1440")
  const [maxUses, setMaxUses] = useState("none")
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!guildSlug) throw new Error("Missing guild slug")

      const res = await apiClient.v1.guilds[":guildSlug"].invites.$post({
        param: { guildSlug },
        json: {
          expiresInMinutes: expiresIn === "never" ? null : Number(expiresIn),
          maxUses: maxUses === "none" ? null : Number(maxUses),
        },
      })

      if (!res.ok) {
        const body = await res.text()
        let message = "Failed to create invite"
        try {
          const parsed = JSON.parse(body) as { message?: string }
          if (typeof parsed.message === "string") message = parsed.message
        } catch {
          // use default message
        }
        throw new Error(message)
      }

      return res.json()
    },
    onSuccess: (data) => {
      setInviteCode(data.invite.code)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invite"
      )
    },
  })

  function getInviteUrl(code: string) {
    return `${window.location.origin}/invite/${code}`
  }

  async function handleCopy() {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(getInviteUrl(inviteCode))
      setCopied(true)
      toast.success("Invite link copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset state when closing
      setInviteCode(null)
      setCopied(false)
      setExpiresIn("1440")
      setMaxUses("none")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invite Link</DialogTitle>
          <DialogDescription>
            Generate a shareable link to invite people to this guild.
          </DialogDescription>
        </DialogHeader>

        {inviteCode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={getInviteUrl(inviteCode)}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setInviteCode(null)
                  setCopied(false)
                }}
              >
                Create Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expire After</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Uses</Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_USES_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <Link className="mr-2 size-4" />
                {createMutation.isPending
                  ? "Generating..."
                  : "Generate Invite Link"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
