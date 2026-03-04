import { z } from "@hono/zod-openapi"
import { selectMessageSchema } from "@repo/db/schema"
import { paginatedResponseSchema, paginationQuerySchema } from "./schemas"

export const messageAuthorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
})

export const messageWithAuthorSchema = selectMessageSchema.extend({
  author: messageAuthorSchema,
  mentions: z.array(messageAuthorSchema),
})

export const listMessagesQuerySchema = paginationQuerySchema

export const listMessagesResponseSchema = paginatedResponseSchema(
  messageWithAuthorSchema
)
