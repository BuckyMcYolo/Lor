import { db } from "@repo/db"
import { message, messageMention, messageReaction, user } from "@repo/db/schema"
import { and, count, desc, eq, inArray } from "drizzle-orm"

export async function fetchMessagePage(
  channelId: string,
  page: number,
  perPage: number,
  currentUserId: string
) {
  const offset = (page - 1) * perPage

  const [countResult, messages] = await Promise.all([
    db
      .select({ total: count() })
      .from(message)
      .where(eq(message.channelId, channelId)),
    db
      .select({
        id: message.id,
        channelId: message.channelId,
        content: message.content,
        type: message.type,
        pinned: message.pinned,
        attachments: message.attachments,
        embeds: message.embeds,
        referencedMessageId: message.referencedMessageId,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
        authorId: message.authorId,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          displayUsername: user.displayUsername,
          image: user.image,
        },
      })
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(eq(message.channelId, channelId))
      .orderBy(desc(message.createdAt))
      .limit(perPage)
      .offset(offset),
  ])

  const itemsTotal = countResult[0]?.total ?? 0
  const totalPages = Math.ceil(itemsTotal / perPage)
  const messageIds = messages.map((msg) => msg.id)

  const mentionRows =
    messageIds.length > 0
      ? await db
          .select({
            messageId: messageMention.messageId,
            id: user.id,
            name: user.name,
            username: user.username,
            displayUsername: user.displayUsername,
            image: user.image,
          })
          .from(messageMention)
          .innerJoin(user, eq(messageMention.mentionedUserId, user.id))
          .where(
            and(
              inArray(messageMention.messageId, messageIds),
              eq(messageMention.mentionType, "direct")
            )
          )
      : []

  const reactionRows =
    messageIds.length > 0
      ? await db
          .select({
            messageId: messageReaction.messageId,
            emoji: messageReaction.emoji,
            userId: messageReaction.userId,
          })
          .from(messageReaction)
          .where(inArray(messageReaction.messageId, messageIds))
      : []

  // Batch-fetch referenced messages for replies
  const referencedMessageIds = messages
    .map((msg) => msg.referencedMessageId)
    .filter((id): id is string => id !== null)

  const referencedMessageRows =
    referencedMessageIds.length > 0
      ? await db
          .select({
            id: message.id,
            content: message.content,
            authorId: user.id,
            authorName: user.name,
            authorUsername: user.username,
            authorDisplayUsername: user.displayUsername,
            authorImage: user.image,
          })
          .from(message)
          .innerJoin(user, eq(message.authorId, user.id))
          .where(inArray(message.id, referencedMessageIds))
      : []

  const referencedMessagesById = new Map(
    referencedMessageRows.map((row) => [
      row.id,
      {
        id: row.id,
        content: row.content,
        author: {
          id: row.authorId,
          name: row.authorName,
          username: row.authorUsername,
          displayUsername: row.authorDisplayUsername,
          image: row.authorImage,
        },
      },
    ])
  )

  const mentionsByMessageId = new Map<
    string,
    Array<{
      id: string
      name: string
      username: string | null
      displayUsername: string | null
      image: string | null
    }>
  >()
  const reactionsByMessageId = new Map<
    string,
    Map<
      string,
      {
        emoji: string
        count: number
        reactedByCurrentUser: boolean
      }
    >
  >()

  for (const mentionRow of mentionRows) {
    const existingMentions = mentionsByMessageId.get(mentionRow.messageId) ?? []
    existingMentions.push({
      id: mentionRow.id,
      name: mentionRow.name,
      username: mentionRow.username,
      displayUsername: mentionRow.displayUsername,
      image: mentionRow.image,
    })
    mentionsByMessageId.set(mentionRow.messageId, existingMentions)
  }

  for (const reactionRow of reactionRows) {
    const reactionsByEmoji =
      reactionsByMessageId.get(reactionRow.messageId) ?? new Map()
    const existingReaction = reactionsByEmoji.get(reactionRow.emoji) ?? {
      emoji: reactionRow.emoji,
      count: 0,
      reactedByCurrentUser: false,
    }

    existingReaction.count += 1
    if (reactionRow.userId === currentUserId) {
      existingReaction.reactedByCurrentUser = true
    }

    reactionsByEmoji.set(reactionRow.emoji, existingReaction)
    reactionsByMessageId.set(reactionRow.messageId, reactionsByEmoji)
  }

  const messagesWithMentions = messages.map((msg) => ({
    ...msg,
    embeds: msg.embeds ?? [],
    mentions: mentionsByMessageId.get(msg.id) ?? [],
    reactions: Array.from(reactionsByMessageId.get(msg.id)?.values() ?? []),
    referencedMessage: msg.referencedMessageId
      ? (referencedMessagesById.get(msg.referencedMessageId) ?? null)
      : null,
  }))

  return {
    itemsTotal,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    data: messagesWithMentions,
  }
}
