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
import { guild } from "./guilds"
import { message } from "./messages"
import { user } from "./users"

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
    // Use userId (not guild_member.id) so notifications survive guild-context changes
    // and also work for DM notifications where guild membership doesn't exist.
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    guildId: uuid("guild_id").references(() => guild.id, {
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
    index("notificationEvent_guildId_idx").on(table.guildId),
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
    guild: one(guild, {
      fields: [notificationEvent.guildId],
      references: [guild.id],
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
