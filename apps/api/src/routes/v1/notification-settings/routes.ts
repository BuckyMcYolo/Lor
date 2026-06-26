import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  internalServerErrorSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import {
  getNotificationSettingsResponseSchema,
  updateNotificationSettingsBodySchema,
  updateNotificationSettingsResponseSchema,
} from "@/routes/v1/notification-settings/schema"

export const getNotificationSettings = createRoute({
  path: "/notification-settings",
  method: "get",
  summary: "Get notification settings",
  description: "Returns the current user's notification settings.",
  tags: ["Notification Settings"],
  middleware: [sessionAuthMiddleware] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: getNotificationSettingsResponseSchema,
      description: "Notification settings",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type GetNotificationSettingsRoute = typeof getNotificationSettings

export const updateNotificationSettings = createRoute({
  path: "/notification-settings",
  method: "patch",
  summary: "Update notification settings",
  description: "Updates the current user's notification settings.",
  tags: ["Notification Settings"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: updateNotificationSettingsBodySchema,
      description: "Notification settings to update",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updateNotificationSettingsResponseSchema,
      description: "Updated notification settings",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UpdateNotificationSettingsRoute = typeof updateNotificationSettings
