import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import { getUserProfileResponseSchema, userIdParamsSchema } from "./schema"

export const getUserProfile = createRoute({
  path: "/users/{userId}",
  method: "get",
  summary: "Get user profile",
  description:
    "Returns a user's public profile including ally status with the current user.",
  tags: ["Users"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: userIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: getUserProfileResponseSchema,
      description: "User profile",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type GetUserProfileRoute = typeof getUserProfile
