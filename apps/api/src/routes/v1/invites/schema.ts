import { z } from "@hono/zod-openapi"
import { workspaceSlugParamsSchema } from "@/routes/v1/channels/schema"

export { workspaceSlugParamsSchema }

// ── Path Params ──────────────────────────────────────────

export const inviteCodeParamsSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(12)
    .openapi({
      param: {
        name: "code",
        in: "path",
        required: true,
      },
      example: "aBc4xZ7q",
    }),
})

export const workspaceInviteCodeParamsSchema = workspaceSlugParamsSchema.extend(
  {
    code: z
      .string()
      .min(1)
      .max(12)
      .openapi({
        param: {
          name: "code",
          in: "path",
          required: true,
        },
        example: "aBc4xZ7q",
      }),
  }
)

// ── Request Schemas ──────────────────────────────────────

export const createInviteRequestSchema = z.object({
  channelId: z.string().uuid().nullable().optional(),
  maxUses: z.number().int().min(1).max(1000).nullable().optional(),
  expiresInMinutes: z
    .number()
    .int()
    .min(30)
    .max(60 * 24 * 7) // max 7 days
    .nullable()
    .optional(),
})

// ── Response Schemas ──────────────────────────────────────

export const workspaceInviteSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  workspaceId: z.string().uuid(),
  inviterId: z.string().uuid(),
  channelId: z.string().uuid().nullable(),
  maxUses: z.number().nullable(),
  uses: z.number(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  inviter: z.object({
    name: z.string(),
    username: z.string().nullable(),
    image: z.string().nullable(),
  }),
})

export const createInviteResponseSchema = z.object({
  success: z.literal(true),
  invite: workspaceInviteSchema,
})

export const listInvitesResponseSchema = z.object({
  success: z.literal(true),
  invites: z.array(workspaceInviteSchema),
})

export const deleteInviteResponseSchema = z.object({
  success: z.literal(true),
})

export const invitePreviewSchema = z.object({
  code: z.string(),
  workspace: z.object({
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable(),
    memberCount: z.number(),
  }),
  channel: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
    })
    .nullable(),
  inviter: z.object({
    name: z.string(),
    username: z.string().nullable(),
    image: z.string().nullable(),
  }),
  isExpired: z.boolean(),
  isMember: z.boolean(),
})

export const invitePreviewResponseSchema = z.object({
  success: z.literal(true),
  invite: invitePreviewSchema,
})

export const acceptInviteResponseSchema = z.object({
  success: z.literal(true),
  workspace: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
})
