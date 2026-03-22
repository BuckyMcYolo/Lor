import { and, db, desc, eq, or, schema } from "@repo/db"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  BlockUserRoute,
  ListBlockedUsersRoute,
  UnblockUserRoute,
} from "./routes"

export const blockUser: AppRouteHandler<BlockUserRoute> = async (c) => {
  const currentUser = c.var.user
  const { userId: targetUserId } = c.req.valid("json")

  if (currentUser.id === targetUserId) {
    return c.json(
      { success: false, message: "Cannot block yourself" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  // Check target user exists
  const targetUser = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1)
    .then((rows) => rows[0])

  if (!targetUser) {
    return c.json(
      { success: false, message: "User not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  // Atomically: insert block + remove any ally relationship
  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.userBlock)
      .values({
        blockerId: currentUser.id,
        blockedId: targetUserId,
      })
      .onConflictDoNothing()
      .returning()

    if (inserted.length === 0) {
      return { alreadyBlocked: true }
    }

    // Delete any ally request between the two users (in either direction)
    await tx
      .delete(schema.allyRequest)
      .where(
        or(
          and(
            eq(schema.allyRequest.senderId, currentUser.id),
            eq(schema.allyRequest.receiverId, targetUserId)
          ),
          and(
            eq(schema.allyRequest.senderId, targetUserId),
            eq(schema.allyRequest.receiverId, currentUser.id)
          )
        )
      )

    return { alreadyBlocked: false }
  })

  if (result.alreadyBlocked) {
    return c.json(
      { success: false, message: "User is already blocked" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  return c.json({ success: true }, HttpStatusCodes.OK)
}

export const unblockUser: AppRouteHandler<UnblockUserRoute> = async (c) => {
  const currentUser = c.var.user
  const { userId: targetUserId } = c.req.valid("param")

  const deleted = await db
    .delete(schema.userBlock)
    .where(
      and(
        eq(schema.userBlock.blockerId, currentUser.id),
        eq(schema.userBlock.blockedId, targetUserId)
      )
    )
    .returning()

  if (deleted.length === 0) {
    return c.json(
      { success: false, message: "Block not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json({ success: true }, HttpStatusCodes.OK)
}

export const listBlockedUsers: AppRouteHandler<ListBlockedUsersRoute> = async (
  c
) => {
  const currentUser = c.var.user

  const blocks = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
      blockedAt: schema.userBlock.createdAt,
    })
    .from(schema.userBlock)
    .innerJoin(schema.user, eq(schema.userBlock.blockedId, schema.user.id))
    .where(eq(schema.userBlock.blockerId, currentUser.id))
    .orderBy(desc(schema.userBlock.createdAt))

  return c.json(
    {
      blockedUsers: blocks.map((b) => ({
        id: b.id,
        name: b.name,
        username: b.username,
        displayUsername: b.displayUsername,
        image: b.image,
        blockedAt: b.blockedAt.toISOString(),
      })),
    },
    HttpStatusCodes.OK
  )
}
