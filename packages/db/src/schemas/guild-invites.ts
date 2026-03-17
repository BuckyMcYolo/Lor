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
import { guild } from "./guilds"
import { user } from "./users"

export const guildInvite = pgTable(
  "guild_invite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id")
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
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
    uniqueIndex("guildInvite_code_uidx").on(table.code),
    index("guildInvite_guildId_idx").on(table.guildId),
  ]
)

export const guildInviteRelations = relations(guildInvite, ({ one }) => ({
  guild: one(guild, {
    fields: [guildInvite.guildId],
    references: [guild.id],
  }),
  inviter: one(user, {
    fields: [guildInvite.inviterId],
    references: [user.id],
  }),
  channel: one(channel, {
    fields: [guildInvite.channelId],
    references: [channel.id],
  }),
}))
