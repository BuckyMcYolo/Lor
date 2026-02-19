import { z } from "@hono/zod-openapi"
import { insertChannelSchema, selectChannelSchema } from "@repo/db/schema"
import {
  listMessagesQuerySchema,
  listMessagesResponseSchema,
  messageWithAuthorSchema,
} from "@/lib/helpers/openapi/message-schemas"

// ── Path Params ──────────────────────────────────────────

export const guildSlugParamsSchema = z.object({
  guildSlug: z.string().openapi({
    param: {
      name: "guildSlug",
      in: "path",
      required: true,
    },
    example: "my-guild",
  }),
})

export const channelParamsSchema = z.object({
  guildSlug: z.string().openapi({
    param: { name: "guildSlug", in: "path", required: true },
    example: "my-guild",
  }),
  channelId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "channelId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

export const channelResponseSchema = selectChannelSchema

export const categoryWithChannelsSchema = selectChannelSchema.extend({
  channels: z.array(selectChannelSchema),
})

export const listChannelsResponseSchema = z.object({
  uncategorized: z.array(selectChannelSchema),
  categories: z.array(categoryWithChannelsSchema),
})

export const createChannelRequestSchema = insertChannelSchema

export const createChannelResponseSchema = selectChannelSchema

// ── Messages ──────────────────────────────────────────

export {
  messageWithAuthorSchema,
  listMessagesQuerySchema,
  listMessagesResponseSchema,
}

// ── Reorder ──────────────────────────────────────────

export const reorderChannelItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
  parentId: z.string().uuid().nullable(),
})

export const reorderChannelsRequestSchema = z.object({
  channels: z.array(reorderChannelItemSchema).min(1),
})

export const reorderChannelsResponseSchema = z.object({
  success: z.literal(true),
})
