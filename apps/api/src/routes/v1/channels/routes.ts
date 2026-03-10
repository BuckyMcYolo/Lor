import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { guildAuthMiddleware } from "@/middleware/guild-auth"
import {
  channelParamsSchema,
  channelResponseSchema,
  createChannelRequestSchema,
  createChannelResponseSchema,
  deleteChannelResponseSchema,
  guildSlugParamsSchema,
  listChannelsResponseSchema,
  listMessagesQuerySchema,
  listMessagesResponseSchema,
  reorderChannelsRequestSchema,
  reorderChannelsResponseSchema,
  updateChannelRequestSchema,
  updateChannelResponseSchema,
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

export const getChannel = createRoute({
  path: "/guilds/{guildSlug}/channels/{channelId}",
  method: "get",
  summary: "Get a channel",
  description: "Gets a single channel by ID within the specified guild.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: channelParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: channelResponseSchema,
      description: "Channel",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const listChannelMessages = createRoute({
  path: "/guilds/{guildSlug}/channels/{channelId}/messages",
  method: "get",
  summary: "List channel messages",
  description: "Returns paginated messages for a channel.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: channelParamsSchema,
    query: listMessagesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listMessagesResponseSchema,
      description: "Paginated messages",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const updateChannel = createRoute({
  path: "/guilds/{guildSlug}/channels/{channelId}",
  method: "patch",
  summary: "Update a channel",
  description:
    "Updates a channel's name, topic, or other properties. Requires channel:update permission.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: channelParamsSchema,
    body: jsonContent({
      schema: updateChannelRequestSchema,
      description: "Channel fields to update",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updateChannelResponseSchema,
      description: "Updated channel",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const deleteChannel = createRoute({
  path: "/guilds/{guildSlug}/channels/{channelId}",
  method: "delete",
  summary: "Delete a channel",
  description:
    "Permanently deletes a channel and all its messages. Requires channel:delete permission.",
  tags: ["Channels"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: channelParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: deleteChannelResponseSchema,
      description: "Channel deleted",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListChannelsRoute = typeof listChannels
export type CreateChannelRoute = typeof createChannel
export type ReorderChannelsRoute = typeof reorderChannels
export type GetChannelRoute = typeof getChannel
export type UpdateChannelRoute = typeof updateChannel
export type DeleteChannelRoute = typeof deleteChannel
export type ListChannelMessagesRoute = typeof listChannelMessages
