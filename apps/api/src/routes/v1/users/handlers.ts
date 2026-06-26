import { db, eq, schema } from "@repo/db"
import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { getRedisClient } from "@/lib/redis"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { GetUserProfileRoute } from "@/routes/v1/users/routes"

export const getUserProfile: AppRouteHandler<GetUserProfileRoute> = async (
  c
) => {
  const { userId } = c.req.valid("param")

  const targetUser = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
      bio: schema.user.bio,
      status: schema.user.status,
      createdAt: schema.user.createdAt,
      isBot: schema.user.isBot,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)
    .then((rows) => rows[0])

  if (!targetUser) {
    return c.json(
      { success: false, message: "User not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  // Check online status. Bots (Merlin) have no socket presence — always online.
  let presenceStatus: "online" | "offline" = "offline"
  if (targetUser.isBot) {
    presenceStatus = "online"
  } else {
    try {
      const redis = await getRedisClient()
      const [isOnline] = await redis.smIsMember(PRESENCE_ONLINE_USERS_SET_KEY, [
        userId,
      ])
      if (isOnline) presenceStatus = "online"
    } catch {
      // fail open — default to offline
    }
  }

  return c.json(
    {
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        displayUsername: targetUser.displayUsername,
        image: targetUser.image,
        bio: targetUser.bio ?? null,
        status: targetUser.status ?? null,
        createdAt: targetUser.createdAt.toISOString(),
        presenceStatus,
      },
    },
    HttpStatusCodes.OK
  )
}
