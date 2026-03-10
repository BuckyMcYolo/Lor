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
import { ac, admin, member, owner, warden } from "./permissions"

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [
    organizationClient({
      ac,
      roles: {
        owner,
        admin,
        warden,
        member,
      },
      schema: inferOrgAdditionalFields<typeof auth>(),
    }),
    adminClient(),
    usernameClient(),
    twoFactorClient(),
    inferAdditionalFields<typeof auth>(), //for inferring user and session additional fields
  ],
})
