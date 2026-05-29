import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { workspaceAuthMiddleware } from "@/middleware/workspace-auth"
import {
  channelParamsSchema,
  channelResponseSchema,
  createChannelRequestSchema,
  createChannelResponseSchema,
  deleteChannelResponseSchema,
  listChannelsResponseSchema,
  listMessagesQuerySchema,
  listMessagesResponseSchema,
  listPinnedMessagesResponseSchema,
  messageIdParamsSchema,
  reorderChannelsRequestSchema,
  reorderChannelsResponseSchema,
  togglePinResponseSchema,
  updateChannelRequestSchema,
  updateChannelResponseSchema,
  workspaceSlugParamsSchema,
} from "./schema"

export const listChannels = createRoute({
  path: "/workspaces/{workspaceSlug}/channels",
  method: "get",
  summary: "List channels",
  description: "Lists all channels in the specified workspace.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
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
  path: "/workspaces/{workspaceSlug}/channels",
  method: "post",
  summary: "Create a channel",
  description: "Creates a new channel in the specified workspace.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
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
  path: "/workspaces/{workspaceSlug}/channels/reorder",
  method: "patch",
  summary: "Reorder channels",
  description:
    "Batch-update channel positions and parent categories within the specified workspace.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
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
  path: "/workspaces/{workspaceSlug}/channels/{channelId}",
  method: "get",
  summary: "Get a channel",
  description: "Gets a single channel by ID within the specified workspace.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
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
  path: "/workspaces/{workspaceSlug}/channels/{channelId}/messages",
  method: "get",
  summary: "List channel messages",
  description: "Returns paginated messages for a channel.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
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
  path: "/workspaces/{workspaceSlug}/channels/{channelId}",
  method: "patch",
  summary: "Update a channel",
  description:
    "Updates a channel's name, topic, or other properties. Requires channel:update permission.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
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
  path: "/workspaces/{workspaceSlug}/channels/{channelId}",
  method: "delete",
  summary: "Delete a channel",
  description:
    "Permanently deletes a channel and all its messages. Requires channel:delete permission.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
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

export const toggleMessagePin = createRoute({
  path: "/workspaces/{workspaceSlug}/channels/{channelId}/messages/{messageId}/pin",
  method: "patch",
  summary: "Toggle message pin",
  description:
    "Pins or unpins a message in the channel. Requires message:pin permission.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: messageIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: togglePinResponseSchema,
      description: "Pin toggled",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const listPinnedMessages = createRoute({
  path: "/workspaces/{workspaceSlug}/channels/{channelId}/pins",
  method: "get",
  summary: "List pinned messages",
  description: "Returns all pinned messages in a channel.",
  tags: ["Channels"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: channelParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listPinnedMessagesResponseSchema,
      description: "Pinned messages",
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
export type ToggleMessagePinRoute = typeof toggleMessagePin
export type ListPinnedMessagesRoute = typeof listPinnedMessages
