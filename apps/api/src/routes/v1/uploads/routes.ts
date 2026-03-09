import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import { presignRequestSchema, presignResponseSchema } from "./schema"

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
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type PresignRoute = typeof presign
