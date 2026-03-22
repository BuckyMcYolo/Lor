import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  badRequestSchema,
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import {
  acceptAllyRequestResponseSchema,
  allyUserIdParamsSchema,
  declineAllyRequestResponseSchema,
  listAlliesResponseSchema,
  listAllyRequestsResponseSchema,
  removeAllyResponseSchema,
  requestIdParamsSchema,
  sendAllyRequestBodySchema,
  sendAllyRequestResponseSchema,
} from "./schema"

export const sendAllyRequest = createRoute({
  path: "/allies/requests",
  method: "post",
  summary: "Send an ally request",
  description: "Sends an ally request to another user.",
  tags: ["Allies"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: sendAllyRequestBodySchema,
      description: "Target user to send ally request to",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: sendAllyRequestResponseSchema,
      description: "Ally request sent",
    }),
    [HttpStatusCodes.BAD_REQUEST]: badRequestSchema,
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type SendAllyRequestRoute = typeof sendAllyRequest

export const listAllyRequests = createRoute({
  path: "/allies/requests",
  method: "get",
  summary: "List pending ally requests",
  description:
    "Returns incoming and outgoing pending ally requests for the current user.",
  tags: ["Allies"],
  middleware: [sessionAuthMiddleware] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listAllyRequestsResponseSchema,
      description: "Pending ally requests",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListAllyRequestsRoute = typeof listAllyRequests

export const acceptAllyRequest = createRoute({
  path: "/allies/requests/{requestId}/accept",
  method: "post",
  summary: "Accept an ally request",
  description: "Accepts a pending incoming ally request.",
  tags: ["Allies"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: requestIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: acceptAllyRequestResponseSchema,
      description: "Ally request accepted",
    }),
    [HttpStatusCodes.BAD_REQUEST]: badRequestSchema,
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type AcceptAllyRequestRoute = typeof acceptAllyRequest

export const declineAllyRequest = createRoute({
  path: "/allies/requests/{requestId}/decline",
  method: "post",
  summary: "Decline an ally request",
  description:
    "Declines a pending incoming ally request. The sender can re-request later.",
  tags: ["Allies"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: requestIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: declineAllyRequestResponseSchema,
      description: "Ally request declined",
    }),
    [HttpStatusCodes.BAD_REQUEST]: badRequestSchema,
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type DeclineAllyRequestRoute = typeof declineAllyRequest

export const listAllies = createRoute({
  path: "/allies",
  method: "get",
  summary: "List allies",
  description: "Returns all allies for the current user.",
  tags: ["Allies"],
  middleware: [sessionAuthMiddleware] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listAlliesResponseSchema,
      description: "List of allies",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListAlliesRoute = typeof listAllies

export const removeAlly = createRoute({
  path: "/allies/{userId}",
  method: "delete",
  summary: "Remove an ally",
  description: "Removes an ally relationship. Either user can remove.",
  tags: ["Allies"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: allyUserIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: removeAllyResponseSchema,
      description: "Ally removed",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type RemoveAllyRoute = typeof removeAlly
