import { z } from "@hono/zod-openapi"
import { assignableGuildRoles } from "@repo/auth/permissions"
import { messageAuthorSchema } from "@/lib/helpers/openapi/message-schemas"
import {
  paginatedResponseSchema,
  paginationQuerySchema,
} from "@/lib/helpers/openapi/schemas"
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

export const moderateGuildMemberResponseSchema = z.object({
  success: z.literal(true),
})

export const updateGuildMemberRoleRequestSchema = z.object({
  role: z.enum(assignableGuildRoles),
})

export const updateGuildMemberRoleResponseSchema = z.object({
  success: z.literal(true),
  member: guildMemberPresenceSchema,
})

// ── Guild Settings ─────────────────────────────────────

export const updateGuildRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    logo: z.string().url().nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.logo !== undefined, {
    message: "At least one field (name or logo) must be provided",
  })

export const updateGuildResponseSchema = z.object({
  success: z.literal(true),
  guild: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable(),
  }),
})

// ── Search ──────────────────────────────────────────────

export const searchMessagesQuerySchema = paginationQuerySchema.extend({
  query: z
    .string()
    .min(1)
    .max(100)
    .openapi({
      param: { name: "query", in: "query", required: true },
      example: "hello",
    }),
  channelId: z
    .string()
    .uuid()
    .optional()
    .openapi({
      param: { name: "channelId", in: "query" },
    }),
})

const searchResultMessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
  channelId: z.string().uuid(),
  channelName: z.string(),
  author: messageAuthorSchema,
})

export const searchMessagesResponseSchema = paginatedResponseSchema(
  searchResultMessageSchema
)
