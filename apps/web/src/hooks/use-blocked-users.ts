import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { apiClient } from "@/lib/api-client"

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const res = await apiClient.v1.blocks.$get()
      if (!res.ok) throw new Error("Failed to fetch blocked users")
      return res.json()
    },
  })
}

export function useBlockedUserIds() {
  const { data } = useBlockedUsers()
  return useMemo(
    () => new Set(data?.blockedUsers.map((u) => u.id) ?? []),
    [data]
  )
}
