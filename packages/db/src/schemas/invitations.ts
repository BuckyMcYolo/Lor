import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { guild } from "./guilds"
import { user } from "./users"

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_guildId_idx").on(table.guildId),
    index("invitation_email_idx").on(table.email),
  ]
)

export const invitationRelations = relations(invitation, ({ one }) => ({
  guild: one(guild, {
    fields: [invitation.guildId],
    references: [guild.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}))
