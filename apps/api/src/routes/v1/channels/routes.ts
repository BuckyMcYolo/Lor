import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { guildAuthMiddleware } from "@/middleware/guild-auth"
import {
  createChannelRequestSchema,
  createChannelResponseSchema,
  guildSlugParamsSchema,
  listChannelsResponseSchema,
  reorderChannelsRequestSchema,
  reorderChannelsResponseSchema,
} from "./schema"

export const listChannels = createRoute({
  path: "/guilds/{guildSlug}/channels",
  method: "get",
  summary: "List channels",
  description: "Lists all channels in the specified guild.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildSlugParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listChannelsResponseSchema,
      description: "List of channels",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const createChannel = createRoute({
  path: "/guilds/{guildSlug}/channels",
  method: "post",
  summary: "Create a channel",
  description: "Creates a new channel in the specified guild.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildSlugParamsSchema,
    body: jsonContent({
      schema: createChannelRequestSchema,
      description: "Channel details",
    }),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent({
      schema: createChannelResponseSchema,
      description: "Channel created",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const reorderChannels = createRoute({
  path: "/guilds/{guildSlug}/channels/reorder",
  method: "patch",
  summary: "Reorder channels",
  description:
    "Batch-update channel positions and parent categories within the specified guild.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildSlugParamsSchema,
    body: jsonContent({
      schema: reorderChannelsRequestSchema,
      description: "Channel positions to update",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: reorderChannelsResponseSchema,
      description: "Channels reordered",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListChannelsRoute = typeof listChannels
export type CreateChannelRoute = typeof createChannel
export type ReorderChannelsRoute = typeof reorderChannels
