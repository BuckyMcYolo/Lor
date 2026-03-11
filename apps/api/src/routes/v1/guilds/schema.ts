import { z } from "@hono/zod-openapi"
import { assignableGuildRoles } from "@repo/auth/permissions"
import { guildSlugParamsSchema } from "@/routes/v1/channels/schema"

export { guildSlugParamsSchema }

export const guildMemberPresenceSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string(),
  isOwner: z.boolean(),
  status: z.enum(["online", "offline"]),
  communicationDisabledUntil: z.string().datetime().nullable(),
  communicationDisabledReason: z.string().nullable(),
})

export const listGuildMembersResponseSchema = z.object({
  guildId: z.string().uuid(),
  guildSlug: z.string(),
  guildName: z.string(),
  ownerId: z.string().uuid(),
  members: z.array(guildMemberPresenceSchema),
})

export const guildMemberParamsSchema = guildSlugParamsSchema.extend({
  userId: z
    .string()
    .uuid()
    .openapi({
      param: {
        name: "userId",
        in: "path",
        required: true,
      },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

export const updateGuildMemberRoleRequestSchema = z.object({
  role: z.enum(assignableGuildRoles),
})

export const updateGuildMemberRoleResponseSchema = z.object({
  success: z.literal(true),
  member: guildMemberPresenceSchema,
})

export const moderateGuildMemberResponseSchema = z.object({
  success: z.literal(true),
})

export const guildBanSchema = z.object({
  userId: z.string().uuid(),
  guildId: z.string().uuid(),
  bannedBy: z.string().uuid(),
  reason: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
})

export const banGuildMemberRequestSchema = z.object({
  reason: z.string().trim().min(1).max(255).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const banGuildMemberResponseSchema = z.object({
  success: z.literal(true),
  ban: guildBanSchema,
})

export const timeoutGuildMemberRequestSchema = z.object({
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 28),
  reason: z.string().trim().min(1).max(255).nullable().optional(),
})

export const timeoutGuildMemberResponseSchema = z.object({
  success: z.literal(true),
  member: guildMemberPresenceSchema,
})
