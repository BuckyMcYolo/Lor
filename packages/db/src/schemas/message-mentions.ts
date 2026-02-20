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

// Per-message targeting facts: who this message mentioned.
// This is immutable/event-like data used to compute mention badges and unread mention counts.
export const mentionTypeEnum = pgEnum("mention_type", ["direct", "everyone"])

export const messageMention = pgTable(
  "message_mention",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channel.id, { onDelete: "cascade" }),
    // Use userId (not guild_member.id) so mentions work in both guild channels and DMs.
    // guild_member is guild-scoped; user is the global identity across all contexts.
    mentionedUserId: uuid("mentioned_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mentionType: mentionTypeEnum("mention_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("messageMention_message_user_uidx").on(
      table.messageId,
      table.mentionedUserId
    ),
    index("messageMention_user_channel_created_idx").on(
      table.mentionedUserId,
      table.channelId,
      table.createdAt
    ),
    index("messageMention_channelId_idx").on(table.channelId),
    index("messageMention_messageId_idx").on(table.messageId),
  ]
)

export const messageMentionRelations = relations(messageMention, ({ one }) => ({
  message: one(message, {
    fields: [messageMention.messageId],
    references: [message.id],
  }),
  channel: one(channel, {
    fields: [messageMention.channelId],
    references: [channel.id],
  }),
  mentionedUser: one(user, {
    fields: [messageMention.mentionedUserId],
    references: [user.id],
  }),
}))
