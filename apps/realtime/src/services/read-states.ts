import { and, count, db, desc, eq, gt, ne, schema, sql } from "@repo/db"
import type { ChannelReadState } from "@repo/realtime-types"
import { assertUserCanAccessChannel } from "./channel-access"

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
      lastReadAt = latestMessage.createdAt
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
