import { relations } from "drizzle-orm"
import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { channel } from "./channels"
import { user } from "./users"
import { workspace } from "./workspaces"

export const workspaceInvite = pgTable(
  "workspace_invite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 12 }).notNull(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").references(() => channel.id, {
      onDelete: "set null",
    }),
    maxUses: integer("max_uses"),
    uses: integer("uses").default(0).notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspaceInvite_code_uidx").on(table.code),
    index("workspaceInvite_workspaceId_idx").on(table.workspaceId),
  ]
)

export const workspaceInviteRelations = relations(
  workspaceInvite,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceInvite.workspaceId],
      references: [workspace.id],
    }),
    inviter: one(user, {
      fields: [workspaceInvite.inviterId],
      references: [user.id],
    }),
    channel: one(channel, {
      fields: [workspaceInvite.channelId],
      references: [channel.id],
    }),
  })
)
