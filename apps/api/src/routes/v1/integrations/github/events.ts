import type { Webhooks } from "@octokit/webhooks"
import { and, db, eq, schema } from "@repo/db"
import { type IngestSourceInput, ingestSource } from "@repo/merlin/sources"
import { logger } from "@/lib/logger"

// What a handler hands to ingestSource, minus the fields we resolve here.
type IngestDraft = Omit<
  IngestSourceInput,
  "workspaceId" | "connectionId" | "provider"
>

const toDate = (s?: string | null): Date | null => (s ? new Date(s) : null)

// Resolve the workspace this installation is linked to, then ingest. Skips
// silently when the install isn't mapped to a workspace yet (setup flow later).
async function ingestForInstallation(
  installationId: number | undefined,
  draft: IngestDraft
): Promise<void> {
  if (installationId === undefined) return
  const connection = await db
    .select({
      id: schema.integrationConnection.id,
      workspaceId: schema.integrationConnection.workspaceId,
    })
    .from(schema.integrationConnection)
    .where(
      and(
        eq(schema.integrationConnection.provider, "github"),
        eq(schema.integrationConnection.externalId, String(installationId)),
        eq(schema.integrationConnection.status, "active")
      )
    )
    .limit(1)
    .then((r) => r[0])
  if (!connection) return

  await ingestSource({
    workspaceId: connection.workspaceId,
    connectionId: connection.id,
    provider: "github",
    ...draft,
  })
  logger.info(
    { kind: draft.kind, externalId: draft.externalId },
    "Ingested GitHub source"
  )
}

// Register the salient events. Payloads are fully typed by @octokit/webhooks.
export function registerGithubHandlers(webhooks: Webhooks): void {
  // Merged PRs — high-signal units of change.
  webhooks.on("pull_request.closed", async ({ payload }) => {
    const pr = payload.pull_request
    if (!pr.merged) return
    const repo = payload.repository.full_name
    await ingestForInstallation(payload.installation?.id, {
      kind: "pull_request",
      externalId: `${repo}#${pr.number}`,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login ?? null,
      occurredAt: toDate(pr.merged_at),
      content: `${pr.title}\n\n${pr.body ?? ""}`,
    })
  })

  webhooks.on(["issues.opened", "issues.closed"], async ({ payload }) => {
    const issue = payload.issue
    const repo = payload.repository.full_name
    await ingestForInstallation(payload.installation?.id, {
      kind: "issue",
      externalId: `${repo}#${issue.number}`,
      title: issue.title,
      url: issue.html_url,
      author: issue.user?.login ?? null,
      occurredAt: toDate(
        payload.action === "closed" ? issue.closed_at : issue.created_at
      ),
      content: `${issue.title}\n\n${issue.body ?? ""}`,
    })
  })

  webhooks.on("release.published", async ({ payload }) => {
    const release = payload.release
    const repo = payload.repository.full_name
    const title = release.name ?? release.tag_name
    await ingestForInstallation(payload.installation?.id, {
      kind: "release",
      externalId: `${repo}@${release.id}`,
      title,
      url: release.html_url,
      author: release.author?.login ?? null,
      occurredAt: toDate(release.published_at),
      content: `${title}\n\n${release.body ?? ""}`,
    })
  })

  // App lifecycle: uninstall drops the connection (sources cascade-purge);
  // suspend/unsuspend toggles status. Workspace mapping is the setup flow.
  webhooks.on(
    ["installation.deleted", "installation.suspend", "installation.unsuspend"],
    async ({ payload }) => {
      const where = and(
        eq(schema.integrationConnection.provider, "github"),
        eq(
          schema.integrationConnection.externalId,
          String(payload.installation.id)
        )
      )
      if (payload.action === "deleted") {
        await db.delete(schema.integrationConnection).where(where)
        return
      }
      await db
        .update(schema.integrationConnection)
        .set({ status: payload.action === "suspend" ? "revoked" : "active" })
        .where(where)
    }
  )
}
