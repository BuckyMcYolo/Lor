import { z } from "@hono/zod-openapi"

// ── Path Params ──────────────────────────────────────────

export const blockUserIdParamsSchema = z.object({
  userId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "userId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

// ── Request Schemas ──────────────────────────────────────

export const blockUserBodySchema = z.object({
  userId: z.string().uuid(),
})

// ── Response Schemas ──────────────────────────────────────

const blockedUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
  blockedAt: z.string().datetime(),
})

export const blockUserResponseSchema = z.object({
  success: z.literal(true),
})

export const unblockUserResponseSchema = z.object({
  success: z.literal(true),
})

export const listBlockedUsersResponseSchema = z.object({
  blockedUsers: z.array(blockedUserSchema),
})
