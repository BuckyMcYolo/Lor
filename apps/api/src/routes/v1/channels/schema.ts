import { z } from "@hono/zod-openapi"
import {
  insertChannelSchema,
  selectChannelSchema,
  updateChannelSchema,
} from "@repo/db/schema"
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

export const channelParamsSchema = guildSlugParamsSchema.extend({
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

// Narrow the create endpoint to guild-creatable types only.
// DMs / group DMs are created via the /dms route, not generic create-channel.
export const createChannelRequestSchema = insertChannelSchema.extend({
  type: z.enum(["text", "voice", "category"]).default("text"),
})

export const createChannelResponseSchema = selectChannelSchema

// ── Update / Delete ──────────────────────────────────────────

const updateChannelRequestBaseSchema = updateChannelSchema
  .pick({
    name: true,
    topic: true,
    rateLimitPerUser: true,
  })
  .strict()

export const updateChannelRequestSchema = updateChannelRequestBaseSchema.refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  {
    message: "At least one channel field must be provided",
  }
)

export const updateChannelResponseSchema = selectChannelSchema

export const deleteChannelResponseSchema = z.object({
  success: z.literal(true),
})

// ── Messages ──────────────────────────────────────────

export {
  messageWithAuthorSchema,
  listMessagesQuerySchema,
  listMessagesResponseSchema,
}

// ── Pins ──────────────────────────────────────────

export const messageIdParamsSchema = channelParamsSchema.extend({
  messageId: z
    .string()
    .uuid()
    .openapi({
      param: { name: "messageId", in: "path", required: true },
      example: "00000000-0000-0000-0000-000000000000",
    }),
})

export const togglePinResponseSchema = z.object({
  success: z.literal(true),
  pinned: z.boolean(),
})

export const listPinnedMessagesResponseSchema = z.object({
  data: z.array(messageWithAuthorSchema),
})

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
