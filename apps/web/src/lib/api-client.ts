import { honoClient } from "@repo/api-client"
import { env } from "@repo/env/client"

export const apiClient = honoClient(env.NEXT_PUBLIC_API_URL, {
  headers: {
    "Content-Type": "application/json",
  },
  init: {
    credentials: "include",
  },
})
