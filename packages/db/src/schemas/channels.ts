import { relations } from "drizzle-orm"
import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
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
import { guild } from "./guilds"
import { message } from "./messages"
import { user } from "./users"

export const channelTypeEnum = pgEnum("channel_type", [
  "text",
  "voice",
  "announcement",
  "forum",
  "dm",
  "group_dm",
  "category",
])

export const channel = pgTable(
  "channel",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    name: text("name"),
    topic: text("topic"),
    type: channelTypeEnum("type").notNull().default("text"),

    // null for DMs/group DMs
    guildId: uuid("guild_id").references(() => guild.id, {
      onDelete: "cascade",
    }),

    // points to a category channel
    parentId: uuid("parent_id").references((): AnyPgColumn => channel.id, {
      onDelete: "set null",
    }),

    // ordering within a category or guild
    position: integer("position").default(0).notNull(),

    // group DM owner — null for guild channels (use roles/permissions instead)
    ownerId: uuid("owner_id").references(() => user.id, {
      onDelete: "set null",
    }),

    // null = no slowmode
    rateLimitPerUser: integer("rate_limit_per_user"),
  },
  (table) => [
    index("channel_guildId_idx").on(table.guildId),
    index("channel_parentId_idx").on(table.parentId),
  ]
)

export const channelRelations = relations(channel, ({ one, many }) => ({
  guild: one(guild, {
    fields: [channel.guildId],
    references: [guild.id],
  }),
  parent: one(channel, {
    fields: [channel.parentId],
    references: [channel.id],
    relationName: "channelParent",
  }),
  children: many(channel, {
    relationName: "channelParent",
  }),
  owner: one(user, {
    fields: [channel.ownerId],
    references: [user.id],
  }),
  messages: many(message),
  members: many(channelMember),
}))

// For DMs and group DMs — tracks which users are in non-guild channels
// Also useful later for per-channel permission overwrites on guild channels
export const channelMember = pgTable(
  "channel_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channel.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("channelMember_channel_user_uidx").on(
      table.channelId,
      table.userId
    ),
    index("channelMember_userId_idx").on(table.userId),
  ]
)

export const channelMemberRelations = relations(channelMember, ({ one }) => ({
  channel: one(channel, {
    fields: [channelMember.channelId],
    references: [channel.id],
  }),
  user: one(user, {
    fields: [channelMember.userId],
    references: [user.id],
  }),
}))

// Zod schemas
export const selectChannelSchema = createSelectSchema(channel)

export const insertChannelSchema = createInsertSchema(channel, {
  name: (s) => s.min(1).max(100),
  topic: (s) => s.max(1024).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  guildId: true,
  ownerId: true,
  position: true,
  rateLimitPerUser: true,
})

export const updateChannelSchema = createUpdateSchema(channel, {
  name: (s) => s.min(1).max(100),
  topic: (s) => s.max(1024),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  guildId: true,
  ownerId: true,
})
