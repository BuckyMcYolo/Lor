import { and, db, eq, or, schema } from "@repo/db"
import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { getRedisClient } from "@/lib/redis"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { GetUserProfileRoute } from "./routes"

export const getUserProfile: AppRouteHandler<GetUserProfileRoute> = async (
  c
) => {
  const currentUser = c.var.user
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

  // Check online status
  let presenceStatus: "online" | "offline" = "offline"
  try {
    const redis = await getRedisClient()
    const [isOnline] = await redis.smIsMember(PRESENCE_ONLINE_USERS_SET_KEY, [
      userId,
    ])
    if (isOnline) presenceStatus = "online"
  } catch {
    // fail open — default to offline
  }

  // Check block relationship
  let blockStatus:
    | "none"
    | "blocked_by_me"
    | "blocked_by_them"
    | "mutual_block" = "none"

  if (currentUser.id !== userId) {
    const blocks = await db
      .select({
        blockerId: schema.userBlock.blockerId,
      })
      .from(schema.userBlock)
      .where(
        or(
          and(
            eq(schema.userBlock.blockerId, currentUser.id),
            eq(schema.userBlock.blockedId, userId)
          ),
          and(
            eq(schema.userBlock.blockerId, userId),
            eq(schema.userBlock.blockedId, currentUser.id)
          )
        )
      )

    const blockedByMe = blocks.some((b) => b.blockerId === currentUser.id)
    const blockedByThem = blocks.some((b) => b.blockerId === userId)

    if (blockedByMe && blockedByThem) {
      blockStatus = "mutual_block"
    } else if (blockedByMe) {
      blockStatus = "blocked_by_me"
    } else if (blockedByThem) {
      blockStatus = "blocked_by_them"
    }
  }

  // Check ally relationship
  const allyRequest = await db
    .select({
      id: schema.allyRequest.id,
      senderId: schema.allyRequest.senderId,
      receiverId: schema.allyRequest.receiverId,
      status: schema.allyRequest.status,
    })
    .from(schema.allyRequest)
    .where(
      or(
        and(
          eq(schema.allyRequest.senderId, currentUser.id),
          eq(schema.allyRequest.receiverId, userId)
        ),
        and(
          eq(schema.allyRequest.senderId, userId),
          eq(schema.allyRequest.receiverId, currentUser.id)
        )
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  let allyStatus: "none" | "pending_incoming" | "pending_outgoing" | "allies" =
    "none"
  let allyRequestId: string | null = null

  if (allyRequest) {
    allyRequestId = allyRequest.id
    if (allyRequest.status === "accepted") {
      allyStatus = "allies"
    } else if (allyRequest.status === "pending") {
      allyStatus =
        allyRequest.senderId === currentUser.id
          ? "pending_outgoing"
          : "pending_incoming"
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
        allyStatus,
        allyRequestId,
        blockStatus,
      },
    },
    HttpStatusCodes.OK
  )
}
