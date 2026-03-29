import { redisStorage } from "@better-auth/redis-storage"
import { db, eq, schema } from "@repo/db"
import { env } from "@repo/env/server"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth/minimal"
import { admin, organization, twoFactor, username } from "better-auth/plugins"
import Redis from "ioredis"
import { Resend } from "resend"
import {
  ac,
  admin as adminRole,
  member as memberRole,
  owner as ownerRole,
  warden,
} from "./permissions"

const redis = new Redis(env.REDIS_URL)
const resend = new Resend(env.RESEND_API_KEY)

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
  secondaryStorage: redisStorage({ client: redis, keyPrefix: "townhall:" }),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "secondary-storage",
    customRules: {
      "/sign-in/*": { window: 10, max: 5 },
      "/sign-up/*": { window: 60, max: 5 },
      "/forgot-password/*": { window: 60, max: 3 },
      "/reset-password/*": { window: 60, max: 5 },
      "/two-factor/*": { window: 10, max: 3 },
    },
  },
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        returned: true,
      },
      bio: {
        type: "string",
        returned: true,
        required: false,
      },
      status: {
        type: "string",
        returned: true,
        required: false,
      },
    },
  },
  trustedOrigins: [
    ...(env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
        ]
      : []),
    "tauri://localhost",
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      resend.emails
        .send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Reset your Townhall password",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
              <h2 style="margin: 0 0 8px; font-size: 24px; color: #1a1a1a;">Reset Your Password</h2>
              <p style="margin: 0 0 24px; color: #555; font-size: 16px; line-height: 1.5;">Click the button below to reset your password.</p>
              <a href="${url}" style="display: inline-block; background: #8B6914; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
              <p style="color: #999; font-size: 13px; margin-top: 24px; line-height: 1.4;">If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
          `,
        })
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to send reset password email:", error)
          } else {
            console.log("Reset password email sent:", data?.id)
          }
        })
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    async sendVerificationEmail({ user, url }) {
      console.error(
        `[TOWNHALL EMAIL] Sending verification email to ${user.email} from ${env.EMAIL_FROM}`
      )
      try {
        const { data, error } = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Verify your Townhall email",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
              <h2 style="margin: 0 0 8px; font-size: 24px; color: #1a1a1a;">Welcome to Townhall</h2>
              <p style="margin: 0 0 24px; color: #555; font-size: 16px; line-height: 1.5;">Click the button below to verify your email address and get started.</p>
              <a href="${url}" style="display: inline-block; background: #8B6914; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Verify Email</a>
              <p style="color: #999; font-size: 13px; margin-top: 24px; line-height: 1.4;">If you didn't create a Townhall account, you can safely ignore this email.</p>
            </div>
          `,
        })
        if (error) {
          console.error("[TOWNHALL EMAIL] Resend error:", JSON.stringify(error))
        } else {
          console.error("[TOWNHALL EMAIL] Sent successfully, id:", data?.id)
        }
      } catch (err) {
        console.error("[TOWNHALL EMAIL] Exception:", err)
      }
    },
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
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        warden,
        member: memberRole,
      },
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
