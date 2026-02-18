import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  internalServerErrorSchema,
  paginationQuerySchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import { listDMsResponseSchema } from "./schema"

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

export type ListDMsRoute = typeof listDMs
