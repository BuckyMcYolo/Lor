import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export type PrivacySettings = {
  dmPrivacy: "everyone" | "allies_only" | "no_one"
  allyRequestPrivacy: "everyone" | "no_one"
  onlineStatusPrivacy: "everyone" | "allies_only" | "no_one"
}

const PRIVACY_SETTINGS_KEY = ["privacy-settings"]

export function usePrivacySettings() {
  return useQuery({
    queryKey: PRIVACY_SETTINGS_KEY,
    queryFn: async () => {
      const res = await apiClient.v1["privacy-settings"].$get()
      if (!res.ok) throw new Error("Failed to fetch privacy settings")
      return res.json() as Promise<PrivacySettings>
    },
  })
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Partial<PrivacySettings>) => {
      const res = await apiClient.v1["privacy-settings"].$patch({
        json: settings,
      })
      if (!res.ok) throw new Error("Failed to update privacy settings")
      return res.json() as Promise<PrivacySettings>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PRIVACY_SETTINGS_KEY, data)
    },
  })
}
