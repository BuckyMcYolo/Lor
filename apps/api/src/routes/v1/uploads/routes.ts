import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  payloadTooLargeSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import {
  avatarPresignRequestSchema,
  avatarPresignResponseSchema,
  guildIconPresignRequestSchema,
  guildIconPresignResponseSchema,
  presignRequestSchema,
  presignResponseSchema,
} from "./schema"

export const presign = createRoute({
  path: "/uploads/presign",
  method: "post",
  summary: "Request a presigned upload URL",
  description:
    "Returns a presigned URL for direct upload to S3-compatible storage.",
  tags: ["Uploads"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: presignRequestSchema,
      description: "File metadata for upload",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: presignResponseSchema,
      description: "Presigned URL for upload",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.REQUEST_TOO_LONG]: payloadTooLargeSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type PresignRoute = typeof presign

export const avatarPresign = createRoute({
  path: "/uploads/avatar/presign",
  method: "post",
  summary: "Request a presigned URL for avatar upload",
  description:
    "Returns a presigned URL for uploading a user avatar to S3-compatible storage.",
  tags: ["Uploads"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: avatarPresignRequestSchema,
      description: "Avatar file metadata",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: avatarPresignResponseSchema,
      description: "Presigned URL for avatar upload",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.REQUEST_TOO_LONG]: payloadTooLargeSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type AvatarPresignRoute = typeof avatarPresign

export const guildIconPresign = createRoute({
  path: "/uploads/guild-icon/presign",
  method: "post",
  summary: "Request a presigned URL for guild icon upload",
  description:
    "Returns a presigned URL for uploading a guild icon to S3-compatible storage.",
  tags: ["Uploads"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    body: jsonContent({
      schema: guildIconPresignRequestSchema,
      description: "Guild icon file metadata",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: guildIconPresignResponseSchema,
      description: "Presigned URL for guild icon upload",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.REQUEST_TOO_LONG]: payloadTooLargeSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type GuildIconPresignRoute = typeof guildIconPresign
