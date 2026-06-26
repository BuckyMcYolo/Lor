import { z } from "@hono/zod-openapi"

export const integrationsWorkspaceParamsSchema = z.object({
  workspaceSlug: z.string().openapi({
    param: { name: "workspaceSlug", in: "path", required: true },
  }),
})

export const connectionIdParamsSchema =
  integrationsWorkspaceParamsSchema.extend({
    connectionId: z
      .string()
      .uuid()
      .openapi({ param: { name: "connectionId", in: "path", required: true } }),
  })

// One row per integration provider: whether this workspace has it connected,
// and how to connect it.
export const integrationStatusSchema = z.object({
  id: z.string(), // provider id, e.g. "github"
  name: z.string(), // display name, e.g. "GitHub"
  connected: z.boolean(),
  accountLogin: z.string().nullable(),
  connectionId: z.string().nullable(),
  connectUrl: z.string().nullable(), // null when the provider isn't configured
})

export const listIntegrationsResponseSchema = z.object({
  providers: z.array(integrationStatusSchema),
})

export const connectGithubRequestSchema = z.object({
  // GitHub App installation ids are numeric; reject anything else up front.
  installationId: z.string().regex(/^\d+$/),
})

export const connectGithubResponseSchema = z.object({
  success: z.literal(true),
  accountLogin: z.string().nullable(),
})

export const disconnectResponseSchema = z.object({
  success: z.literal(true),
})
