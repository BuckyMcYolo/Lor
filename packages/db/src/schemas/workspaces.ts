import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod"
import { invitation } from "./invitations"
import { user } from "./users"
import { workspaceInvite } from "./workspace-invites"
import { workspaceMember } from "./workspace-members"
import { workspaceRole } from "./workspace-roles"

export const workspace = pgTable(
  "workspace",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    ownerId: uuid("owner_id") // source of truth for workspace ownership — derive owner status by comparing user.id against workspace.ownerId, NOT from workspace_member.role
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }), // don't delete workspace if owner deletes account
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("workspace_slug_uidx").on(table.slug)]
)

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  user: one(user, {
    fields: [workspace.ownerId],
    references: [user.id],
  }),
  workspaceMembers: many(workspaceMember),
  workspaceRoles: many(workspaceRole),
  invitations: many(invitation),
  workspaceInvites: many(workspaceInvite),
}))

// Zod schemas
export const selectWorkspaceSchema = createSelectSchema(workspace)

export const insertWorkspaceSchema = createInsertSchema(workspace, {
  name: (s) => s.min(1).max(100),
})

export const updateWorkspaceSchema = createUpdateSchema(workspace, {
  name: (s) => s.min(1).max(100),
})
