import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  badRequestSchema,
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  paginationQuerySchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import {
  createDMRequestSchema,
  createDMResponseSchema,
  dmParamsSchema,
  getDMResponseSchema,
  listDMMessagesQuerySchema,
  listDMMessagesResponseSchema,
  listDMsResponseSchema,
} from "./schema"

export const createDM = createRoute({
  path: "/dms",
  method: "post",
  summary: "Create or find a DM",
  description:
    "Creates a new DM or group DM with the specified users, or returns an existing one. For 1-on-1 DMs, requires the target user to be an ally. For group DMs, requires all target users to be allies of the creator.",
  tags: ["DMs"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: createDMRequestSchema,
      description: "User IDs to create DM with",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: createDMResponseSchema,
      description: "DM channel created or found",
    }),
    [HttpStatusCodes.BAD_REQUEST]: badRequestSchema,
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type CreateDMRoute = typeof createDM

export const listDMs = createRoute({
  path: "/dms",
  method: "get",
  summary: "List DMs",
  description: "Lists all DM and group DM channels for the authenticated user.",
  tags: ["DMs"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    query: paginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listDMsResponseSchema,
      description: "List of DM channels with member info",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const getDM = createRoute({
  path: "/dms/{dmId}",
  method: "get",
  summary: "Get a DM",
  description:
    "Gets a single DM or group DM channel by ID for the authenticated user.",
  tags: ["DMs"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: dmParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: getDMResponseSchema,
      description: "DM channel with member info",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const listDMMessages = createRoute({
  path: "/dms/{dmId}/messages",
  method: "get",
  summary: "List DM messages",
  description: "Returns paginated messages for a DM or group DM channel.",
  tags: ["DMs"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: dmParamsSchema,
    query: listDMMessagesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listDMMessagesResponseSchema,
      description: "Paginated DM messages",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListDMsRoute = typeof listDMs
export type GetDMRoute = typeof getDM
export type ListDMMessagesRoute = typeof listDMMessages
