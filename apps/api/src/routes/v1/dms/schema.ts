import { z } from "@hono/zod-openapi"
import { selectChannelSchema } from "@repo/db/schema"
import {
  listMessagesQuerySchema,
  listMessagesResponseSchema,
  messageAuthorSchema,
} from "@/lib/helpers/openapi/message-schemas"
import {
  paginatedResponseSchema,
  paginationQuerySchema,
} from "@/lib/helpers/openapi/schemas"

export const dmParamsSchema = z.object({
  dmId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "dmId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

export const dmMessageIdParamsSchema = dmParamsSchema.extend({
  messageId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "messageId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

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

export const dmMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
})

export const dmChannelSchema = selectChannelSchema.extend({
  members: z.array(dmMemberSchema),
  lastMessage: lastMessageSchema.nullable(),
})

export const createDMRequestSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, "At least one user is required")
    .max(9, "Group DMs can have at most 10 members"),
})

export const createDMResponseSchema = z.object({
  success: z.literal(true),
  dm: dmChannelSchema,
  created: z.boolean(),
})

export const listDMsResponseSchema = paginatedResponseSchema(dmChannelSchema)

export const getDMResponseSchema = dmChannelSchema

export const listDMMessagesQuerySchema = listMessagesQuerySchema
export const listDMMessagesResponseSchema = listMessagesResponseSchema

// ── Search ──────────────────────────────────────────────

export const searchDMMessagesQuerySchema = paginationQuerySchema.extend({
  query: z
    .string()
    .min(1)
    .max(100)
    .openapi({
      param: { name: "query", in: "query", required: true },
      example: "hello",
    }),
  dmId: z
    .string()
    .uuid()
    .optional()
    .openapi({
      param: { name: "dmId", in: "query" },
    }),
})

const dmSearchResultSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.string().datetime(),
  channelId: z.string().uuid(),
  channelName: z.string(),
  author: messageAuthorSchema,
})

export const searchDMMessagesResponseSchema =
  paginatedResponseSchema(dmSearchResultSchema)
