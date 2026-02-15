import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { guildMember } from "./guild-members"
import { guildRole } from "./guild-roles"
import { invitation } from "./invitations"
import { user } from "./users"

export const guild = pgTable(
  "guild",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    ownerId: uuid("owner_id") // this is the source of truth for the owner of the guild, the guildMember who owns this guild will also have role === "owner" so we will need to keep these in sync
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }), // don't delete guild if owner deletes account
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("guild_slug_uidx").on(table.slug)]
)

export const guildRelations = relations(guild, ({ one, many }) => ({
  user: one(user, {
    fields: [guild.ownerId],
    references: [user.id],
  }),
  guildRoles: many(guildRole),
  guildMembers: many(guildMember),
  invitations: many(invitation),
}))
