import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { channel } from "./channels"
import { message } from "./messages"
import { user } from "./users"
import { workspace } from "./workspaces"

export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "direct_mention",
  "everyone_mention",
  "system",
])

// Per-user notification inbox/events for delivery + read lifecycle.
// Unlike message_mention (targeting facts), rows here represent what should be shown/sent to a user.
export const notificationEvent = pgTable(
  "notification_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Use userId (not workspace_member.id) so notifications survive workspace-context changes
    // and also work for DM notifications where workspace membership doesn't exist.
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspace.id, {
      onDelete: "cascade",
    }),
    channelId: uuid("channel_id").references(() => channel.id, {
      onDelete: "cascade",
    }),
    messageId: uuid("message_id").references(() => message.id, {
      onDelete: "set null",
    }),
    type: notificationEventTypeEnum("type").notNull(),
    readAt: timestamp("read_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notificationEvent_user_message_type_uidx").on(
      table.userId,
      table.messageId,
      table.type
    ),
    index("notificationEvent_user_createdAt_idx").on(
      table.userId,
      table.createdAt
    ),
    index("notificationEvent_user_readAt_idx").on(table.userId, table.readAt),
    index("notificationEvent_workspaceId_idx").on(table.workspaceId),
    index("notificationEvent_channelId_idx").on(table.channelId),
  ]
)

export const notificationEventRelations = relations(
  notificationEvent,
  ({ one }) => ({
    user: one(user, {
      fields: [notificationEvent.userId],
      references: [user.id],
    }),
    workspace: one(workspace, {
      fields: [notificationEvent.workspaceId],
      references: [workspace.id],
    }),
    channel: one(channel, {
      fields: [notificationEvent.channelId],
      references: [channel.id],
    }),
    message: one(message, {
      fields: [notificationEvent.messageId],
      references: [message.id],
    }),
  })
)
