import { z } from "@hono/zod-openapi"
import { selectChannelSchema } from "@repo/db/schema"
import { paginatedResponseSchema } from "@/lib/helpers/openapi/schemas"

export const lastMessageAuthorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
})

export const lastMessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().nullable(),
  createdAt: z.string().datetime(),
  author: lastMessageAuthorSchema,
})

export const dmChannelSchema = selectChannelSchema.extend({
  lastMessage: lastMessageSchema.nullable(),
})

export const listDMsResponseSchema = paginatedResponseSchema(dmChannelSchema)
