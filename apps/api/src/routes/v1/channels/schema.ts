import { z } from "@hono/zod-openapi"
import { insertChannelSchema, selectChannelSchema } from "@repo/db/schema"

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
