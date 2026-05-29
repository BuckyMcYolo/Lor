import { z } from "@hono/zod-openapi"
import { assignableWorkspaceRoles } from "@repo/auth/permissions"
import { messageAuthorSchema } from "@/lib/helpers/openapi/message-schemas"
import {
  paginatedResponseSchema,
  paginationQuerySchema,
} from "@/lib/helpers/openapi/schemas"
import { workspaceSlugParamsSchema } from "@/routes/v1/channels/schema"

export { workspaceSlugParamsSchema }

export const workspaceMemberPresenceSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string(),
  isOwner: z.boolean(),
  status: z.enum(["online", "offline"]),
})

export const listWorkspaceMembersResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceSlug: z.string(),
  workspaceName: z.string(),
  ownerId: z.string().uuid(),
  members: z.array(workspaceMemberPresenceSchema),
})

export const workspaceMemberParamsSchema = workspaceSlugParamsSchema.extend({
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

export const moderateWorkspaceMemberResponseSchema = z.object({
  success: z.literal(true),
})

export const updateWorkspaceMemberRoleRequestSchema = z.object({
  role: z.enum(assignableWorkspaceRoles),
})

export const updateWorkspaceMemberRoleResponseSchema = z.object({
  success: z.literal(true),
  member: workspaceMemberPresenceSchema,
})

// ── Workspace Settings ─────────────────────────────────────

export const updateWorkspaceRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    logo: z.string().url().nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.logo !== undefined, {
    message: "At least one field (name or logo) must be provided",
  })

export const updateWorkspaceResponseSchema = z.object({
  success: z.literal(true),
  workspace: z.object({
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
