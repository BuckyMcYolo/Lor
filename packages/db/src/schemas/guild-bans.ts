import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { guild } from "./guilds"
import { user } from "./users"

export const guildBan = pgTable(
  "guild_ban",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    guildId: uuid("guild_id")
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bannedBy: uuid("banned_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reason: varchar("reason", { length: 255 }),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    revokeReason: text("revoke_reason"),
  },
  (table) => [
    uniqueIndex("guildBan_guild_user_uidx").on(table.guildId, table.userId),
    index("guildBan_guild_idx").on(table.guildId),
    index("guildBan_user_idx").on(table.userId),
  ]
)

export const guildBanRelations = relations(guildBan, ({ one }) => ({
  guild: one(guild, {
    fields: [guildBan.guildId],
    references: [guild.id],
  }),
  user: one(user, {
    relationName: "guildBanUser",
    fields: [guildBan.userId],
    references: [user.id],
  }),
  bannedByUser: one(user, {
    relationName: "guildBanModerator",
    fields: [guildBan.bannedBy],
    references: [user.id],
  }),
}))
