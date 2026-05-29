import { relations } from "drizzle-orm"
import {
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
import { guildInvite } from "./guild-invites"
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
    ownerId: uuid("owner_id") // source of truth for guild ownership — derive owner status by comparing user.id against guild.ownerId, NOT from guild_member.role
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
  guildMembers: many(guildMember),
  guildRoles: many(guildRole),
  invitations: many(invitation),
  guildInvites: many(guildInvite),
}))

// Zod schemas
export const selectGuildSchema = createSelectSchema(guild)

export const insertGuildSchema = createInsertSchema(guild, {
  name: (s) => s.min(1).max(100),
})

export const updateGuildSchema = createUpdateSchema(guild, {
  name: (s) => s.min(1).max(100),
})
