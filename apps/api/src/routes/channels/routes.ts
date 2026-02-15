import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { authMiddleware } from "@/middleware/auth"
import {
  createChannelRequestSchema,
  createChannelResponseSchema,
  listChannelsResponseSchema,
} from "./schema"

export const listChannels = createRoute({
  path: "/channels",
  method: "get",
  summary: "List channels",
  description: "Lists all channels in the user's active guild.",
  tags: ["Channels"],
  middleware: [authMiddleware] as const,
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
  path: "/channels",
  method: "post",
  summary: "Create a channel",
  description:
    "Creates a new channel in the user's active guild. Guild ID is derived from the session.",
  tags: ["Channels"],
  middleware: [authMiddleware] as const,
  request: {
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

export type ListChannelsRoute = typeof listChannels
export type CreateChannelRoute = typeof createChannel
