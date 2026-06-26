import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core"
import {
  integrationConnection,
  integrationProviderEnum,
} from "./integration-connections"
import { workspace } from "./workspaces"

// Track B: one ingested unit of external knowledge — a summary + pointer +
// embedding for a meaningful event (PR merged, issue closed, release, …).
// Embed the summary, not the document; structured details are live-fetched via
// fetch_source, so the row stays fully typed (no metadata bag).
// See reference/merlin-mvp-spec.md §6.

export const sourceStatusEnum = pgEnum("source_status", ["active", "archived"])

export const source = pgTable(
  "source",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnection.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    // Provider-specific unit, e.g. "pull_request" | "issue" | "release" |
    // "discussion" | "workflow_run". Free text — kinds vary across providers.
    kind: text("kind").notNull(),
    // Stable provider id for upsert/dedupe, e.g. "owner/repo#123" or a node id.
    externalId: text("external_id").notNull(),
    // Pointer to the source; full content is live-fetched, never stored whole.
    url: text("url"),
    title: text("title").notNull(),
    // The actor (e.g. GitHub login). Null when an event has no clear author.
    author: text("author"),
    // The embedded text (a short summary)
    summary: text("summary").notNull(),
    // text-embedding-3-small; null until embedded. cosine ops.
    embedding: vector("embedding", { dimensions: 1536 }),
    occurredAt: timestamp("occurred_at"),
    status: sourceStatusEnum("status").notNull().default("active"),
  },
  (table) => [
    // Re-ingesting the same unit upserts in place.
    uniqueIndex("source_workspace_provider_external_uidx").on(
      table.workspaceId,
      table.provider,
      table.externalId
    ),
    index("source_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
)

export const sourceRelations = relations(source, ({ one }) => ({
  workspace: one(workspace, {
    fields: [source.workspaceId],
    references: [workspace.id],
  }),
  connection: one(integrationConnection, {
    fields: [source.connectionId],
    references: [integrationConnection.id],
  }),
}))

export type Source = typeof source.$inferSelect
export type NewSource = typeof source.$inferInsert
