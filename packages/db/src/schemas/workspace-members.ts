import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod"
import { user } from "./users"
import { workspace } from "./workspaces"

export const WORKSPACE_MEMBER_ROLES = ["member", "admin"] as const
export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number]

export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("workspaceMember_workspaceId_idx").on(table.workspaceId),
    index("workspaceMember_userId_idx").on(table.userId),
  ]
)

export const workspaceMemberRelations = relations(
  workspaceMember,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceMember.workspaceId],
      references: [workspace.id],
    }),
    user: one(user, {
      fields: [workspaceMember.userId],
      references: [user.id],
    }),
  })
)

// Zod schemas
export const selectWorkspaceMemberSchema = createSelectSchema(workspaceMember)
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMember)
export const updateWorkspaceMemberSchema = createUpdateSchema(workspaceMember)
