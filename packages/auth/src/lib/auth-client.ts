import { env } from "@repo/env/client"
import {
  adminClient,
  inferAdditionalFields,
  inferOrgAdditionalFields,
  organizationClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import type { auth } from "./auth.js"

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [
    organizationClient({
      schema: inferOrgAdditionalFields<typeof auth>(),
    }),
    adminClient(),
    usernameClient(),
    twoFactorClient(),
    inferAdditionalFields<typeof auth>(), //for inferring user and session additional fields
  ],
})
