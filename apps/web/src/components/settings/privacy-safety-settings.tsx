import { Label } from "@repo/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import { Separator } from "@repo/ui/components/separator"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  type PrivacySettings,
  usePrivacySettings,
  useUpdatePrivacySettings,
} from "@/hooks/use-privacy-settings"

const DM_PRIVACY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "allies_only", label: "Allies Only" },
  { value: "no_one", label: "No One" },
] as const

const ALLY_REQUEST_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "no_one", label: "No One" },
] as const

const ONLINE_STATUS_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "allies_only", label: "Allies Only" },
  { value: "no_one", label: "No One" },
] as const

export function PrivacySafetySettings() {
  const { data: settings, isPending } = usePrivacySettings()
  const { mutate: updateSettings } = useUpdatePrivacySettings()

  const handleChange = (key: keyof PrivacySettings, value: string) => {
    updateSettings(
      { [key]: value },
      {
        onError: () => {
          toast.error("Failed to update privacy setting")
        },
      }
    )
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Privacy & Safety</h3>
        <p className="text-sm text-muted-foreground">
          Control who can contact you and see your activity.
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dm-privacy">Who can send you direct messages</Label>
          <p className="text-xs text-muted-foreground">
            Controls who can start a new DM conversation with you.
          </p>
          <Select
            value={settings?.dmPrivacy ?? "everyone"}
            onValueChange={(v) => handleChange("dmPrivacy", v)}
          >
            <SelectTrigger id="dm-privacy" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DM_PRIVACY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ally-privacy">Who can send you ally requests</Label>
          <p className="text-xs text-muted-foreground">
            Controls who can send you ally requests.
          </p>
          <Select
            value={settings?.allyRequestPrivacy ?? "everyone"}
            onValueChange={(v) => handleChange("allyRequestPrivacy", v)}
          >
            <SelectTrigger id="ally-privacy" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALLY_REQUEST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="online-privacy">Who can see your online status</Label>
          <p className="text-xs text-muted-foreground">
            Controls who can see when you are online in guilds.
          </p>
          <Select
            value={settings?.onlineStatusPrivacy ?? "everyone"}
            onValueChange={(v) => handleChange("onlineStatusPrivacy", v)}
          >
            <SelectTrigger id="online-privacy" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ONLINE_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
