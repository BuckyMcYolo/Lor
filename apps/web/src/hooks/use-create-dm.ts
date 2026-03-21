import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

export function useCreateDM() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const res = await apiClient.v1.dms.$post({
        json: { userIds },
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(
          "message" in body ? body.message : "Failed to create DM"
        )
      }
      return res.json()
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["dms"] })
      void navigate({ to: "/dms/$dmId", params: { dmId: data.dm.id } })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
