import { z } from "@hono/zod-openapi"
import { selectAllyRequestSchema } from "@repo/db/schema"

// ── Path Params ──────────────────────────────────────────

export const requestIdParamsSchema = z.object({
  requestId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "requestId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

export const allyUserIdParamsSchema = z.object({
  userId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "userId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

// ── Request Schemas ──────────────────────────────────────

export const sendAllyRequestBodySchema = z.object({
  userId: z.string().uuid(),
})

// ── Response Schemas ──────────────────────────────────────

const allyUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
})

export const allyRequestResponseSchema = z.object({
  id: selectAllyRequestSchema.shape.id,
  sender: allyUserSchema,
  receiver: allyUserSchema,
  status: selectAllyRequestSchema.shape.status,
  createdAt: z.string().datetime(),
})

export const sendAllyRequestResponseSchema = z.object({
  success: z.literal(true),
  request: allyRequestResponseSchema,
})

export const listAllyRequestsResponseSchema = z.object({
  incoming: z.array(allyRequestResponseSchema),
  outgoing: z.array(allyRequestResponseSchema),
})

export const acceptAllyRequestResponseSchema = z.object({
  success: z.literal(true),
  request: allyRequestResponseSchema,
})

export const declineAllyRequestResponseSchema = z.object({
  success: z.literal(true),
})

export const listAlliesResponseSchema = z.object({
  allies: z.array(allyUserSchema),
})

export const removeAllyResponseSchema = z.object({
  success: z.literal(true),
})
