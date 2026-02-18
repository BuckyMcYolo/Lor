import { z } from "@hono/zod-openapi"
import { insertChannelSchema, selectChannelSchema } from "@repo/db/schema"

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

export const channelResponseSchema = selectChannelSchema

export const categoryWithChannelsSchema = selectChannelSchema.extend({
  channels: z.array(selectChannelSchema),
})

export const listChannelsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    uncategorized: z.array(selectChannelSchema),
    categories: z.array(categoryWithChannelsSchema),
  }),
})

export const createChannelRequestSchema = insertChannelSchema

export const createChannelResponseSchema = z.object({
  success: z.literal(true),
  data: selectChannelSchema,
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
