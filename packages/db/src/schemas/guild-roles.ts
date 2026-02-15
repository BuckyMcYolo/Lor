import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { guild } from "./guilds"

export const guildRole = pgTable(
  "guild_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(
      () => /* @__PURE__ */ new Date()
    ),
    guildId: uuid("guild_id")
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permission: text("permission").notNull(),
  },
  (table) => [
    index("guildRole_guildId_idx").on(table.guildId),
    index("guildRole_role_idx").on(table.role),
  ]
)

export const guildRoleRelations = relations(guildRole, ({ one }) => ({
  guild: one(guild, {
    fields: [guildRole.guildId],
    references: [guild.id],
  }),
}))
