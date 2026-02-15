import { relations } from "drizzle-orm"
import {
  type AnyPgColumn,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { channel } from "./channels"
import { user } from "./users"

export const messageTypeEnum = pgEnum("message_type", [
  "default",
  "reply",
  "system_join",
  "system_leave",
  "system_pin",
  "channel_name_change",
])

export const message = pgTable(
  "message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channel.id, { onDelete: "cascade" }),
    authorId: uuid("author_id") // all messages must have an author
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    content: text("content"),
    type: messageTypeEnum("type").notNull().default("default"),

    // for replies — points to the message being replied to
    referencedMessageId: uuid("referenced_message_id").references(
      (): AnyPgColumn => message.id,
      { onDelete: "set null" }
    ),

    // file attachments as JSON array
    // [{ url, filename, size, contentType, width?, height? }]
    attachments: jsonb("attachments").$type<Attachment[]>().default([]),

    // link/media embeds
    // [{ type, url, title?, description?, thumbnail? }]
    embeds: jsonb("embeds").$type<Embed[]>().default([]),

    pinned: boolean("pinned").default(false).notNull(),

    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("message_channelId_createdAt_idx").on(
      table.channelId,
      table.createdAt
    ),
    index("message_authorId_idx").on(table.authorId),
    index("message_referencedMessageId_idx").on(table.referencedMessageId),
  ]
)

export const messageRelations = relations(message, ({ one }) => ({
  channel: one(channel, {
    fields: [message.channelId],
    references: [channel.id],
  }),
  author: one(user, {
    fields: [message.authorId],
    references: [user.id],
  }),
  referencedMessage: one(message, {
    fields: [message.referencedMessageId],
    references: [message.id],
    relationName: "messageReply",
  }),
}))

// Type definitions for the JSONB fields
export type Attachment = {
  url: string
  filename: string
  size: number
  contentType: string
  width?: number
  height?: number
}

export type Embed = {
  type: "link" | "image" | "video" | "rich"
  url: string
  title?: string
  description?: string
  thumbnail?: string
}
