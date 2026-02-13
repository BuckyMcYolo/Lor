import { db, schema } from "@repo/db"
import { env } from "@repo/env/server"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth/minimal"
import { admin, organization, twoFactor, username } from "better-auth/plugins"

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_API_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
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
          additionalFields: {
            ownerId: {
              type: "string",
              fieldName: "ownerId",
              references: {
                field: "id",
                table: "user",
                model: "user",
                onDelete: "restrict",
              },
              required: true,
              returned: true,
            },
          },
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
        organizationRole: {
          modelName: "guildRole",
          fields: {
            organizationId: "guildId",
          },
        },
      },
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    admin(),
    username(),
    twoFactor(),
  ],
})

export type Session = typeof auth.$Infer.Session
