import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { guildMember } from "./guild-members"
import { invitation } from "./invitations"

export const guild = pgTable(
  "guild",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("guild_slug_uidx").on(table.slug)]
)

export const guildRelations = relations(guild, ({ many }) => ({
  guildMembers: many(guildMember),
  invitations: many(invitation),
}))
