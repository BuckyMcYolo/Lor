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
  dmMessageIdParamsSchema,
  dmParamsSchema,
  getDMResponseSchema,
  listDMMessagesQuerySchema,
  listDMMessagesResponseSchema,
  listDMsResponseSchema,
  searchDMMessagesQuerySchema,
  searchDMMessagesResponseSchema,
} from "@/routes/v1/dms/schema"

export const createDM = createRoute({
  path: "/dms",
  method: "post",
  summary: "Create or find a DM",
  description:
    "Creates a new DM or group DM with the specified users, or returns an existing one. All target users must share at least one workspace with the requester.",
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

export const searchDMMessages = createRoute({
  path: "/dms/search",
  method: "get",
  summary: "Search DM messages",
  description:
    "Searches messages across all DM and group DM conversations for the authenticated user.",
  tags: ["DMs"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    query: searchDMMessagesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: searchDMMessagesResponseSchema,
      description: "Search results",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const listDMThreadReplies = createRoute({
  path: "/dms/{dmId}/messages/{messageId}/thread",
  method: "get",
  summary: "List DM thread replies",
  description:
    "Returns paginated replies under a thread root in a DM, using cursor pagination.",
  tags: ["DMs"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: dmMessageIdParamsSchema,
    query: listDMMessagesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listDMMessagesResponseSchema,
      description: "Paginated thread replies",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListDMsRoute = typeof listDMs
export type GetDMRoute = typeof getDM
export type ListDMMessagesRoute = typeof listDMMessages
export type SearchDMMessagesRoute = typeof searchDMMessages
export type ListDMThreadRepliesRoute = typeof listDMThreadReplies
