import { and, db, eq, ne, or, schema } from "@repo/db"

/**
 * Check if a block exists between users in a 1:1 DM channel.
 * Only enforced for "dm" type, NOT "group_dm" — in group DMs,
 * blocked users can still send but messages are hidden client-side.
 */
export async function isDMBlockedForUser(
  channelId: string,
  userId: string
): Promise<boolean> {
  // Get the single other member of the 1:1 DM
  const otherMember = await db
    .select({ userId: schema.channelMember.userId })
    .from(schema.channelMember)
    .where(
      and(
        eq(schema.channelMember.channelId, channelId),
        ne(schema.channelMember.userId, userId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!otherMember) return false

  const otherUserId = otherMember.userId

  // Check if a block exists in either direction
  const block = await db
    .select({ id: schema.userBlock.id })
    .from(schema.userBlock)
    .where(
      or(
        and(
          eq(schema.userBlock.blockerId, userId),
          eq(schema.userBlock.blockedId, otherUserId)
        ),
        and(
          eq(schema.userBlock.blockerId, otherUserId),
          eq(schema.userBlock.blockedId, userId)
        )
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  return !!block
}
