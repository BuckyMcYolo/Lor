import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  badRequestSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import {
  blockUserBodySchema,
  blockUserIdParamsSchema,
  blockUserResponseSchema,
  listBlockedUsersResponseSchema,
  unblockUserResponseSchema,
} from "./schema"

export const blockUser = createRoute({
  path: "/blocks",
  method: "post",
  summary: "Block a user",
  description:
    "Blocks a user. Removes any existing ally relationship between the users.",
  tags: ["Blocks"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: blockUserBodySchema,
      description: "User to block",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: blockUserResponseSchema,
      description: "User blocked",
    }),
    [HttpStatusCodes.BAD_REQUEST]: badRequestSchema,
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type BlockUserRoute = typeof blockUser

export const unblockUser = createRoute({
  path: "/blocks/{userId}",
  method: "delete",
  summary: "Unblock a user",
  description: "Removes a block on the specified user.",
  tags: ["Blocks"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: blockUserIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: unblockUserResponseSchema,
      description: "User unblocked",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UnblockUserRoute = typeof unblockUser

export const listBlockedUsers = createRoute({
  path: "/blocks",
  method: "get",
  summary: "List blocked users",
  description: "Returns all users blocked by the current user.",
  tags: ["Blocks"],
  middleware: [sessionAuthMiddleware] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listBlockedUsersResponseSchema,
      description: "List of blocked users",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListBlockedUsersRoute = typeof listBlockedUsers
