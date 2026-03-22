import { db, eq, schema } from "@repo/db"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  GetPrivacySettingsRoute,
  UpdatePrivacySettingsRoute,
} from "./routes"

const DEFAULT_SETTINGS = {
  dmPrivacy: "everyone" as const,
  allyRequestPrivacy: "everyone" as const,
  onlineStatusPrivacy: "everyone" as const,
}

export const getPrivacySettings: AppRouteHandler<
  GetPrivacySettingsRoute
> = async (c) => {
  const currentUser = c.var.user

  const settings = await db
    .select({
      dmPrivacy: schema.userPrivacySettings.dmPrivacy,
      allyRequestPrivacy: schema.userPrivacySettings.allyRequestPrivacy,
      onlineStatusPrivacy: schema.userPrivacySettings.onlineStatusPrivacy,
    })
    .from(schema.userPrivacySettings)
    .where(eq(schema.userPrivacySettings.userId, currentUser.id))
    .limit(1)
    .then((rows) => rows[0])

  return c.json(settings ?? DEFAULT_SETTINGS, HttpStatusCodes.OK)
}

export const updatePrivacySettings: AppRouteHandler<
  UpdatePrivacySettingsRoute
> = async (c) => {
  const currentUser = c.var.user
  const body = c.req.valid("json")

  const updated = await db
    .insert(schema.userPrivacySettings)
    .values({
      userId: currentUser.id,
      ...body,
    })
    .onConflictDoUpdate({
      target: schema.userPrivacySettings.userId,
      set: body,
    })
    .returning({
      dmPrivacy: schema.userPrivacySettings.dmPrivacy,
      allyRequestPrivacy: schema.userPrivacySettings.allyRequestPrivacy,
      onlineStatusPrivacy: schema.userPrivacySettings.onlineStatusPrivacy,
    })
    .then((rows) => rows[0])

  if (!updated) {
    return c.json(DEFAULT_SETTINGS, HttpStatusCodes.OK)
  }

  return c.json(updated, HttpStatusCodes.OK)
}
