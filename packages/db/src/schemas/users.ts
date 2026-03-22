import { relations } from "drizzle-orm"
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { account } from "./accounts"
import { guildBan } from "./guild-bans"
import { guildMember } from "./guild-members"
import { guild } from "./guilds"
import { invitation } from "./invitations"
import { session } from "./sessions"
import { twoFactor } from "./two-factors"
import { userBlock } from "./user-blocks"

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  bio: varchar("bio", { length: 255 }),
  status: varchar("status", { length: 128 }),
})

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  guilds: many(guild), // can be owners of many guilds
  guildBans: many(guildBan, {
    relationName: "guildBanUser",
  }),
  issuedGuildBans: many(guildBan, {
    relationName: "guildBanModerator",
  }),
  guildMembers: many(guildMember, {
    relationName: "guildMembershipUser",
  }),
  moderatedGuildMembers: many(guildMember, {
    relationName: "guildMemberModerator",
  }),
  invitations: many(invitation),
  twoFactors: many(twoFactor),
  blockedUsers: many(userBlock, {
    relationName: "userBlockBlocker",
  }),
  blockedByUsers: many(userBlock, {
    relationName: "userBlockBlocked",
  }),
}))
