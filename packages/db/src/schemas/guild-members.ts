import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { guild } from "./guilds"
import { user } from "./users"

export const guildMember = pgTable(
  "guild_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
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
    fields: [guildMember.userId],
    references: [user.id],
  }),
}))
