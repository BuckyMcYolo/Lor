import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  internalServerErrorSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import {
  getPrivacySettingsResponseSchema,
  updatePrivacySettingsBodySchema,
  updatePrivacySettingsResponseSchema,
} from "./schema"

export const getPrivacySettings = createRoute({
  path: "/privacy-settings",
  method: "get",
  summary: "Get privacy settings",
  description: "Returns the current user's privacy settings.",
  tags: ["Privacy Settings"],
  middleware: [sessionAuthMiddleware] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: getPrivacySettingsResponseSchema,
      description: "Privacy settings",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type GetPrivacySettingsRoute = typeof getPrivacySettings

export const updatePrivacySettings = createRoute({
  path: "/privacy-settings",
  method: "patch",
  summary: "Update privacy settings",
  description: "Updates the current user's privacy settings.",
  tags: ["Privacy Settings"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: updatePrivacySettingsBodySchema,
      description: "Privacy settings to update",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updatePrivacySettingsResponseSchema,
      description: "Updated privacy settings",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UpdatePrivacySettingsRoute = typeof updatePrivacySettings
