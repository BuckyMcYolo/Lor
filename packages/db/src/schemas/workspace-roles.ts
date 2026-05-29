import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { workspace } from "./workspaces"

export const workspaceRole = pgTable(
  "workspace_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(
      () => /* @__PURE__ */ new Date()
    ),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permission: text("permission").notNull(),
  },
  (table) => [
    index("workspaceRole_workspaceId_idx").on(table.workspaceId),
    index("workspaceRole_role_idx").on(table.role),
  ]
)

export const workspaceRoleRelations = relations(workspaceRole, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceRole.workspaceId],
    references: [workspace.id],
  }),
}))
