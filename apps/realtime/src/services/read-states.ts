import { and, count, db, desc, eq, gt, ne, schema } from "@repo/db"
import type { ChannelReadState } from "@/lib/events"
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
        lastReadMessageId,
        lastReadAt,
        updatedAt: new Date(),
      },
    })

  const [unreadCountRow, mentionCountRow] = await Promise.all([
    db
      .select({
        count: count(),
      })
      .from(schema.message)
      .where(
        and(
          eq(schema.message.channelId, input.channelId),
          gt(schema.message.createdAt, lastReadAt),
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
          gt(schema.messageMention.createdAt, lastReadAt)
        )
      )
      .then((rows) => rows[0]),
  ])

  return {
    channelId: input.channelId,
    lastReadMessageId,
    lastReadAt: lastReadAt.toISOString(),
    unreadCount: Number(unreadCountRow?.count ?? 0),
    mentionCount: Number(mentionCountRow?.count ?? 0),
  }
}
