import {
  and,
  count,
  db,
  desc,
  eq,
  gt,
  inArray,
  ne,
  schema,
  sql,
} from "@repo/db"
import type {
  ChannelReadState,
  NotificationBootstrap,
} from "@repo/realtime-types"
import { assertUserCanAccessChannel } from "@/services/channel-access"

type MarkChannelReadInput = {
  userId: string
  channelId: string
  lastReadMessageId?: string
}

export async function markChannelRead(
  input: MarkChannelReadInput
): Promise<ChannelReadState> {
  await assertUserCanAccessChannel(input.userId, input.channelId)

  let lastReadMessageId = input.lastReadMessageId ?? null
  let lastReadAt = new Date()

  if (input.lastReadMessageId) {
    const targetMessage = await db
      .select({
        id: schema.message.id,
        channelId: schema.message.channelId,
        createdAt: schema.message.createdAt,
      })
      .from(schema.message)
      .where(eq(schema.message.id, input.lastReadMessageId))
      .limit(1)
      .then((rows) => rows[0])

    if (!targetMessage || targetMessage.channelId !== input.channelId) {
      throw new Error("Message not found in channel")
    }

    lastReadMessageId = targetMessage.id
    lastReadAt = targetMessage.createdAt
  } else {
    const latestMessage = await db
      .select({
        id: schema.message.id,
        createdAt: schema.message.createdAt,
      })
      .from(schema.message)
      .where(eq(schema.message.channelId, input.channelId))
      .orderBy(desc(schema.message.createdAt))
      .limit(1)
      .then((rows) => rows[0])

    if (latestMessage) {
      lastReadMessageId = latestMessage.id
      // Use current time to avoid precision mismatches between
      // JS Date (ms) and Postgres timestamp (μs)
      lastReadAt = new Date()
    }
  }

  await db
    .insert(schema.channelReadState)
    .values({
      channelId: input.channelId,
      userId: input.userId,
      lastReadMessageId,
      lastReadAt,
    })
    .onConflictDoUpdate({
      target: [
        schema.channelReadState.channelId,
        schema.channelReadState.userId,
      ],
      set: {
        lastReadAt: sql`GREATEST(${schema.channelReadState.lastReadAt}, excluded.last_read_at)`,
        lastReadMessageId: sql`CASE
          WHEN excluded.last_read_at >= ${schema.channelReadState.lastReadAt}
          THEN excluded.last_read_message_id
          ELSE ${schema.channelReadState.lastReadMessageId}
        END`,
        updatedAt: new Date(),
      },
    })

  const persistedState = await db
    .select({
      lastReadAt: schema.channelReadState.lastReadAt,
      lastReadMessageId: schema.channelReadState.lastReadMessageId,
    })
    .from(schema.channelReadState)
    .where(
      and(
        eq(schema.channelReadState.channelId, input.channelId),
        eq(schema.channelReadState.userId, input.userId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!persistedState) {
    throw new Error("Failed to persist read state")
  }

  const [unreadCountRow, mentionCountRow] = await Promise.all([
    db
      .select({
        count: count(),
      })
      .from(schema.message)
      .where(
        and(
          eq(schema.message.channelId, input.channelId),
          gt(schema.message.createdAt, persistedState.lastReadAt),
          ne(schema.message.authorId, input.userId)
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        count: count(),
      })
      .from(schema.messageMention)
      .where(
        and(
          eq(schema.messageMention.channelId, input.channelId),
          eq(schema.messageMention.mentionedUserId, input.userId),
          gt(schema.messageMention.createdAt, persistedState.lastReadAt)
        )
      )
      .then((rows) => rows[0]),
  ])

  return {
    channelId: input.channelId,
    lastReadMessageId: persistedState.lastReadMessageId,
    lastReadAt: persistedState.lastReadAt.toISOString(),
    unreadCount: Number(unreadCountRow?.count ?? 0),
    mentionCount: Number(mentionCountRow?.count ?? 0),
  }
}

/**
 * Get unread message and mention counts for all channels a user is a member of.
 * Used to bootstrap the frontend unread state on socket connect.
 */
export async function getUnreadStatesForUser(
  userId: string
): Promise<NotificationBootstrap> {
  // Get DM/group DM channel IDs via channel_member
  const dmMemberships = await db
    .select({ channelId: schema.channelMember.channelId })
    .from(schema.channelMember)
    .where(eq(schema.channelMember.userId, userId))

  // Get workspace channel IDs via workspace_member -> channels
  const workspaceMemberships = await db
    .select({ workspaceId: schema.workspaceMember.workspaceId })
    .from(schema.workspaceMember)
    .where(eq(schema.workspaceMember.userId, userId))

  let workspaceChannelIds: string[] = []
  if (workspaceMemberships.length > 0) {
    const workspaceIds = workspaceMemberships.map((m) => m.workspaceId)
    const workspaceChannels = await db
      .select({ id: schema.channel.id })
      .from(schema.channel)
      .where(inArray(schema.channel.workspaceId, workspaceIds))
    workspaceChannelIds = workspaceChannels.map((c) => c.id)
  }

  const channelIds = [
    ...new Set([
      ...dmMemberships.map((m) => m.channelId),
      ...workspaceChannelIds,
    ]),
  ]

  if (channelIds.length === 0) {
    return { readStates: [] }
  }

  // Get existing read states for these channels
  const readStates = await db
    .select({
      channelId: schema.channelReadState.channelId,
      lastReadAt: schema.channelReadState.lastReadAt,
      lastReadMessageId: schema.channelReadState.lastReadMessageId,
    })
    .from(schema.channelReadState)
    .where(
      and(
        eq(schema.channelReadState.userId, userId),
        inArray(schema.channelReadState.channelId, channelIds)
      )
    )

  const readStateMap = new Map(readStates.map((rs) => [rs.channelId, rs]))

  // For each channel, compute unread and mention counts
  const results = await Promise.all(
    channelIds.map(async (channelId) => {
      const readState = readStateMap.get(channelId)
      const lastReadAt = readState?.lastReadAt ?? new Date(0)

      const [unreadRow, mentionRow] = await Promise.all([
        db
          .select({ count: count() })
          .from(schema.message)
          .where(
            and(
              eq(schema.message.channelId, channelId),
              gt(schema.message.createdAt, lastReadAt),
              ne(schema.message.authorId, userId)
            )
          )
          .then((rows) => rows[0]),
        db
          .select({ count: count() })
          .from(schema.messageMention)
          .where(
            and(
              eq(schema.messageMention.channelId, channelId),
              eq(schema.messageMention.mentionedUserId, userId),
              gt(schema.messageMention.createdAt, lastReadAt)
            )
          )
          .then((rows) => rows[0]),
      ])

      const unreadCount = Number(unreadRow?.count ?? 0)
      const mentionCount = Number(mentionRow?.count ?? 0)

      // Only include channels with unread activity
      if (unreadCount === 0 && mentionCount === 0) return null

      return {
        channelId,
        unreadCount,
        mentionCount,
        lastReadMessageId: readState?.lastReadMessageId ?? null,
      }
    })
  )

  return {
    readStates: results.filter((r): r is NonNullable<typeof r> => r !== null),
  }
}
