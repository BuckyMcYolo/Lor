import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { guild } from "./guilds"
import { user } from "./users"

export const guildMember = pgTable(
  "guild_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id")
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    communicationDisabledUntil: timestamp("communication_disabled_until"),
    communicationDisabledBy: uuid("communication_disabled_by").references(
      () => user.id,
      { onDelete: "set null" }
    ),
    communicationDisabledReason: varchar("communication_disabled_reason", {
      length: 255,
    }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("guildMember_guildId_idx").on(table.guildId),
    index("guildMember_userId_idx").on(table.userId),
  ]
)

export const guildMemberRelations = relations(guildMember, ({ one }) => ({
  guild: one(guild, {
    fields: [guildMember.guildId],
    references: [guild.id],
  }),
  user: one(user, {
    relationName: "guildMembershipUser",
    fields: [guildMember.userId],
    references: [user.id],
  }),
  communicationDisabledByUser: one(user, {
    relationName: "guildMemberModerator",
    fields: [guildMember.communicationDisabledBy],
    references: [user.id],
  }),
}))
