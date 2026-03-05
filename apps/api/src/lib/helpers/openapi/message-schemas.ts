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

export const messageReactionSchema = z.object({
  emoji: z.string(),
  count: z.number().int().nonnegative(),
  reactedByCurrentUser: z.boolean(),
})

const httpsUrlSchema = z.string().regex(/^https?:\/\//i)

export const messageEmbedSchema = z.object({
  type: z.enum(["link", "image", "video", "rich"]),
  url: httpsUrlSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnail: httpsUrlSchema.optional(),
  siteName: z.string().optional(),
})

export const messageWithAuthorSchema = selectMessageSchema.extend({
  author: messageAuthorSchema,
  mentions: z.array(messageAuthorSchema),
  reactions: z.array(messageReactionSchema),
  embeds: z.array(messageEmbedSchema),
})

export const listMessagesQuerySchema = paginationQuerySchema

export const listMessagesResponseSchema = paginatedResponseSchema(
  messageWithAuthorSchema
)
