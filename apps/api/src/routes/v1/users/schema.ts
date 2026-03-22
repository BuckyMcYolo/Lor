import { z } from "@hono/zod-openapi"

export const userIdParamsSchema = z.object({
  userId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "userId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

export const userProfileResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
  bio: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: z.string().datetime(),
  presenceStatus: z.enum(["online", "offline"]),
  allyStatus: z.enum([
    "none",
    "pending_incoming",
    "pending_outgoing",
    "allies",
  ]),
  allyRequestId: z.string().uuid().nullable(),
  blockStatus: z.enum([
    "none",
    "blocked_by_me",
    "blocked_by_them",
    "mutual_block",
  ]),
})

export const getUserProfileResponseSchema = z.object({
  success: z.literal(true),
  user: userProfileResponseSchema,
})
