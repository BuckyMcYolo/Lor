import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { channel } from "./channels"
import { message } from "./messages"
import { user } from "./users"

export const channelReadState = pgTable(
  "channel_read_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channel.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadMessageId: uuid("last_read_message_id").references(
      () => message.id,
      {
        onDelete: "set null",
      }
    ),
    lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("channelReadState_channel_user_uidx").on(
      table.channelId,
      table.userId
    ),
    index("channelReadState_userId_idx").on(table.userId),
    index("channelReadState_channelId_idx").on(table.channelId),
  ]
)

export const channelReadStateRelations = relations(
  channelReadState,
  ({ one }) => ({
    channel: one(channel, {
      fields: [channelReadState.channelId],
      references: [channel.id],
    }),
    user: one(user, {
      fields: [channelReadState.userId],
      references: [user.id],
    }),
    lastReadMessage: one(message, {
      fields: [channelReadState.lastReadMessageId],
      references: [message.id],
    }),
  })
)
