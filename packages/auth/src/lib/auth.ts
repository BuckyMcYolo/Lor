import { db } from "@repo/db"
import { env } from "@repo/env/server"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth/minimal"
import { admin, organization, twoFactor, username } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    cookiePrefix: "townhall",
    database: {
      generateId: false,
    },
  },
  plugins: [
    organization({
      schema: {
        organization: {
          modelName: "guild",
        },
        member: {
          modelName: "guildMember",
          fields: {
            organizationId: "guildId",
          },
        },
        invitation: {
          fields: {
            organizationId: "guildId",
          },
        },
        session: {
          fields: {
            activeOrganizationId: "activeGuildId",
          },
        },
      },
    }),
    admin(),
    username(),
    twoFactor(),
  ],
})

export type Session = typeof auth.$Infer.Session
