import { db, eq, schema } from "@repo/db"
import { env } from "@repo/env/server"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth/minimal"
import { admin, organization, twoFactor, username } from "better-auth/plugins"

const defaultGuildChannels = {
  uncategorized: [
    { name: "general", type: "text" as const },
    { name: "introductions", type: "text" as const },
  ],
  categories: [
    {
      name: "Information",
      channels: [
        { name: "announcements", type: "announcement" as const },
        { name: "rules", type: "text" as const },
      ],
    },
    {
      name: "Community",
      channels: [
        { name: "help", type: "text" as const },
        { name: "off-topic", type: "text" as const },
      ],
    },
  ],
}

async function seedDefaultGuildChannels(guildId: string) {
  await db.transaction(async (tx) => {
    let topLevelPosition = 0

    const uncategorizedRows = defaultGuildChannels.uncategorized.map(
      (ch, index) => ({
        name: ch.name,
        type: ch.type,
        guildId,
        position: topLevelPosition + index,
      })
    )

    if (uncategorizedRows.length > 0) {
      await tx.insert(schema.channel).values(uncategorizedRows)
    }
    topLevelPosition += uncategorizedRows.length

    for (const categoryConfig of defaultGuildChannels.categories) {
      const createdCategory = await tx
        .insert(schema.channel)
        .values({
          name: categoryConfig.name,
          type: "category",
          guildId,
          position: topLevelPosition++,
        })
        .returning({ id: schema.channel.id })
        .then((rows) => rows[0])

      if (!createdCategory) continue

      const childRows = categoryConfig.channels.map((ch, channelIndex) => ({
        name: ch.name,
        type: ch.type,
        guildId,
        parentId: createdCategory.id,
        position: channelIndex,
      }))

      if (childRows.length > 0) {
        await tx.insert(schema.channel).values(childRows)
      }
    }
  })
}

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_API_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        returned: true,
      },
    },
  },
  trustedOrigins:
    env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
        ]
      : [],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    cookiePrefix: "townhall",
    database: {
      generateId: false,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
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
                model: "user",
                onDelete: "restrict",
              },
              required: false,
              input: false,
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
      organizationHooks: {
        beforeCreateOrganization: async ({ organization, user }) => {
          return { data: { ...organization, ownerId: user.id } }
        },
        afterCreateOrganization: async ({ organization, user }) => {
          try {
            await seedDefaultGuildChannels(organization.id)
          } catch (error) {
            console.error(
              `Failed to seed default channels for guild ${organization.id}:`,
              error
            )
            return
          }

          try {
            await db
              .update(schema.user)
              .set({ onboardingCompleted: true })
              .where(eq(schema.user.id, user.id))
          } catch (error) {
            console.error(
              `Failed to mark onboarding as completed for user ${user.id}:`,
              error
            )
          }
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
export type ActiveGuild = typeof auth.$Infer.ActiveOrganization
export type ActiveGuildMember = ActiveGuild["members"][number]
