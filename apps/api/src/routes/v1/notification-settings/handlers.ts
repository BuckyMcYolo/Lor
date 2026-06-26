import { db, eq, schema } from "@repo/db"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  GetNotificationSettingsRoute,
  UpdateNotificationSettingsRoute,
} from "@/routes/v1/notification-settings/routes"

const DEFAULT_SETTINGS = {
  desktopNotifications: "all_messages" as const,
  dmNotifications: "all_messages" as const,
}

export const getNotificationSettings: AppRouteHandler<
  GetNotificationSettingsRoute
> = async (c) => {
  const currentUser = c.var.user

  const settings = await db
    .select({
      desktopNotifications:
        schema.userNotificationSettings.desktopNotifications,
      dmNotifications: schema.userNotificationSettings.dmNotifications,
    })
    .from(schema.userNotificationSettings)
    .where(eq(schema.userNotificationSettings.userId, currentUser.id))
    .limit(1)
    .then((rows) => rows[0])

  return c.json(settings ?? DEFAULT_SETTINGS, HttpStatusCodes.OK)
}

export const updateNotificationSettings: AppRouteHandler<
  UpdateNotificationSettingsRoute
> = async (c) => {
  const currentUser = c.var.user
  const body = c.req.valid("json")

  const updated = await db
    .insert(schema.userNotificationSettings)
    .values({
      userId: currentUser.id,
      ...body,
    })
    .onConflictDoUpdate({
      target: schema.userNotificationSettings.userId,
      set: body,
    })
    .returning({
      desktopNotifications:
        schema.userNotificationSettings.desktopNotifications,
      dmNotifications: schema.userNotificationSettings.dmNotifications,
    })
    .then((rows) => rows[0])

  if (!updated) {
    return c.json(DEFAULT_SETTINGS, HttpStatusCodes.OK)
  }

  return c.json(updated, HttpStatusCodes.OK)
}
