import { relations } from "drizzle-orm"
import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { user } from "./users"

export const dmPrivacyEnum = pgEnum("dm_privacy", [
  "everyone",
  "allies_only",
  "no_one",
])

export const allyRequestPrivacyEnum = pgEnum("ally_request_privacy", [
  "everyone",
  "no_one",
])

export const onlineStatusPrivacyEnum = pgEnum("online_status_privacy", [
  "everyone",
  "allies_only",
  "no_one",
])

export const userPrivacySettings = pgTable("user_privacy_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  dmPrivacy: dmPrivacyEnum("dm_privacy").default("everyone").notNull(),
  allyRequestPrivacy: allyRequestPrivacyEnum("ally_request_privacy")
    .default("everyone")
    .notNull(),
  onlineStatusPrivacy: onlineStatusPrivacyEnum("online_status_privacy")
    .default("everyone")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const selectUserPrivacySettingsSchema =
  createSelectSchema(userPrivacySettings)
export const insertUserPrivacySettingsSchema = createInsertSchema(
  userPrivacySettings
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const privacySettingsResponseSchema =
  selectUserPrivacySettingsSchema.pick({
    dmPrivacy: true,
    allyRequestPrivacy: true,
    onlineStatusPrivacy: true,
  })

export const updatePrivacySettingsSchema = insertUserPrivacySettingsSchema
  .pick({
    dmPrivacy: true,
    allyRequestPrivacy: true,
    onlineStatusPrivacy: true,
  })
  .partial()

export const userPrivacySettingsRelations = relations(
  userPrivacySettings,
  ({ one }) => ({
    user: one(user, {
      fields: [userPrivacySettings.userId],
      references: [user.id],
    }),
  })
)
