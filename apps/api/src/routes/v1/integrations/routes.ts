import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { workspaceAuthMiddleware } from "@/middleware/workspace-auth"
import {
  connectGithubRequestSchema,
  connectGithubResponseSchema,
  connectionIdParamsSchema,
  disconnectResponseSchema,
  integrationsWorkspaceParamsSchema,
  listIntegrationsResponseSchema,
} from "./schema"

export const listIntegrations = createRoute({
  path: "/workspaces/{workspaceSlug}/integrations",
  method: "get",
  summary: "List a workspace's integrations",
  description: "Returns each provider's connection status + connect link.",
  tags: ["Integrations"],
  middleware: [workspaceAuthMiddleware] as const,
  request: { params: integrationsWorkspaceParamsSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listIntegrationsResponseSchema,
      description: "Integration statuses",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const connectGithub = createRoute({
  path: "/workspaces/{workspaceSlug}/integrations/github/connect",
  method: "post",
  summary: "Link a GitHub App installation to a workspace",
  description:
    "Called by the post-install setup redirect with the installation id.",
  tags: ["Integrations"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: integrationsWorkspaceParamsSchema,
    body: jsonContent({
      schema: connectGithubRequestSchema,
      description: "The GitHub App installation id",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: connectGithubResponseSchema,
      description: "Connected",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export const disconnectIntegration = createRoute({
  path: "/workspaces/{workspaceSlug}/integrations/{connectionId}",
  method: "delete",
  summary: "Disconnect an integration",
  description: "Removes the connection; its ingested sources are purged.",
  tags: ["Integrations"],
  middleware: [workspaceAuthMiddleware] as const,
  request: { params: connectionIdParamsSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: disconnectResponseSchema,
      description: "Disconnected",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListIntegrationsRoute = typeof listIntegrations
export type ConnectGithubRoute = typeof connectGithub
export type DisconnectIntegrationRoute = typeof disconnectIntegration
