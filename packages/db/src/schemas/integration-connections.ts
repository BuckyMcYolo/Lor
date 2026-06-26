import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { workspace } from "./workspaces"

// Track B: a workspace's link to an external account (e.g. a GitHub App
// installation). Connectors ingest `source` rows under a connection; the
// provider enum is shared with `source`. See reference/merlin-mvp-spec.md §6.

// Add providers deliberately as connectors land.
export const integrationProviderEnum = pgEnum("integration_provider", [
  "github",
])

export const integrationConnectionStatusEnum = pgEnum(
  "integration_connection_status",
  ["active", "revoked"]
)

export const integrationConnection = pgTable(
  "integration_connection",
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
    provider: integrationProviderEnum("provider").notNull(),
    // Provider-side handle: the GitHub App installation id, etc.
    externalId: text("external_id").notNull(),
    // Display label for the connected account (e.g. the GitHub org/user login).
    accountLogin: text("account_login"),
    status: integrationConnectionStatusEnum("status")
      .notNull()
      .default("active"),
  },
  (table) => [
    // A provider account maps to one connection (installation ids are unique).
    uniqueIndex("integration_connection_provider_external_uidx").on(
      table.provider,
      table.externalId
    ),
    index("integration_connection_workspace_idx").on(table.workspaceId),
  ]
)

export const integrationConnectionRelations = relations(
  integrationConnection,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [integrationConnection.workspaceId],
      references: [workspace.id],
    }),
  })
)

export type IntegrationConnection = typeof integrationConnection.$inferSelect
export type NewIntegrationConnection = typeof integrationConnection.$inferInsert
