import { db } from "@repo/db"
import { integrationConnection } from "@repo/db/schema"
import { env } from "@repo/env/server"
import { getSourceProvider } from "@repo/merlin/providers"
import { and, eq } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { logger } from "@/lib/logger"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  ConnectGithubRoute,
  DisconnectIntegrationRoute,
  ListIntegrationsRoute,
} from "./routes"

export const listIntegrations: AppRouteHandler<ListIntegrationsRoute> = async (
  c
) => {
  const workspace = c.var.workspace

  const github = await db
    .select({
      id: integrationConnection.id,
      accountLogin: integrationConnection.accountLogin,
    })
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.workspaceId, workspace.id),
        eq(integrationConnection.provider, "github"),
        eq(integrationConnection.status, "active")
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  // Install link is built server-side so the App slug stays out of the client.
  // `state` carries the workspace back to the setup redirect.
  if (!env.GITHUB_APP_SLUG) {
    logger.warn(
      { workspaceSlug: workspace.slug },
      "GITHUB_APP_SLUG not set; GitHub integration shows as Unavailable"
    )
  }
  const connectUrl = env.GITHUB_APP_SLUG
    ? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new?state=${workspace.slug}`
    : null

  return c.json(
    {
      providers: [
        {
          id: "github",
          name: "GitHub",
          connected: !!github,
          accountLogin: github?.accountLogin ?? null,
          connectionId: github?.id ?? null,
          connectUrl,
        },
      ],
    },
    HttpStatusCodes.OK
  )
}

export const connectGithub: AppRouteHandler<ConnectGithubRoute> = async (c) => {
  const workspace = c.var.workspace
  const { installationId } = c.req.valid("json")

  // Best-effort verify + label (null when the App isn't configured yet).
  const verified = await getSourceProvider("github")
    ?.verifyConnection({ externalId: installationId })
    .catch(() => null)
  const accountLogin = verified?.accountLabel ?? null

  await db
    .insert(integrationConnection)
    .values({
      workspaceId: workspace.id,
      provider: "github",
      externalId: installationId,
      accountLogin,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [
        integrationConnection.provider,
        integrationConnection.externalId,
      ],
      set: { workspaceId: workspace.id, accountLogin, status: "active" },
    })

  return c.json({ success: true as const, accountLogin }, HttpStatusCodes.OK)
}

export const disconnectIntegration: AppRouteHandler<
  DisconnectIntegrationRoute
> = async (c) => {
  const workspace = c.var.workspace
  const { connectionId } = c.req.valid("param")

  const deleted = await db
    .delete(integrationConnection)
    .where(
      and(
        eq(integrationConnection.id, connectionId),
        eq(integrationConnection.workspaceId, workspace.id)
      )
    )
    .returning({ id: integrationConnection.id })
    .then((rows) => rows[0])

  if (!deleted) {
    return c.json(
      { success: false, message: "Connection not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json({ success: true as const }, HttpStatusCodes.OK)
}
