import { relations } from "drizzle-orm"
import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { user } from "./users"

export const desktopNotificationEnum = pgEnum("desktop_notification", [
  "all_messages",
  "mentions_only",
  "nothing",
])

export const dmNotificationEnum = pgEnum("dm_notification", [
  "all_messages",
  "nothing",
])

export const userNotificationSettings = pgTable("user_notification_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  desktopNotifications: desktopNotificationEnum("desktop_notifications")
    .default("all_messages")
    .notNull(),
  dmNotifications: dmNotificationEnum("dm_notifications")
    .default("all_messages")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const selectUserNotificationSettingsSchema = createSelectSchema(
  userNotificationSettings
)
export const insertUserNotificationSettingsSchema = createInsertSchema(
  userNotificationSettings
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const notificationSettingsResponseSchema =
  selectUserNotificationSettingsSchema.pick({
    desktopNotifications: true,
    dmNotifications: true,
  })

export const updateNotificationSettingsSchema =
  insertUserNotificationSettingsSchema
    .pick({
      desktopNotifications: true,
      dmNotifications: true,
    })
    .partial()

export const userNotificationSettingsRelations = relations(
  userNotificationSettings,
  ({ one }) => ({
    user: one(user, {
      fields: [userNotificationSettings.userId],
      references: [user.id],
    }),
  })
)
