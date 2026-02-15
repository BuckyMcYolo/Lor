import { z } from "@hono/zod-openapi"
import { insertChannelSchema, selectChannelSchema } from "@repo/db/schema"

export const channelResponseSchema = selectChannelSchema

export const listChannelsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(selectChannelSchema),
})

export const createChannelRequestSchema = insertChannelSchema

export const createChannelResponseSchema = z.object({
  success: z.literal(true),
  data: selectChannelSchema,
})
