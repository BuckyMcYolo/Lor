import { db } from "@repo/db"
import type { Attachment, Embed } from "@repo/db/schema"
import { message, messageMention, messageReaction, user } from "@repo/db/schema"
import { and, asc, desc, eq, gt, inArray, lt, or } from "drizzle-orm"

type BareMessageRow = {
  id: string
  channelId: string
  content: string | null
  type: (typeof message.type.enumValues)[number]
  pinned: boolean
  attachments: Attachment[] | null
  embeds: Embed[] | null
  referencedMessageId: string | null
  editedAt: Date | null
  createdAt: Date
  authorId: string
  author: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  }
}

const messageSelect = {
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
} as const

type FetchMessagesParams = {
  channelId: string
  currentUserId: string
  limit: number
  // mutually exclusive — at most one is set. If none, returns the latest page.
  around?: string
  before?: string
  after?: string
}

export async function fetchMessages({
  channelId,
  currentUserId,
  limit,
  around,
  before,
  after,
}: FetchMessagesParams) {
  const anchorId = around ?? before ?? after ?? null

  // Look up the anchor's (createdAt, id) so we can do stable comparisons
  // even when multiple messages share a millisecond timestamp.
  let anchor: { id: string; createdAt: Date } | null = null
  if (anchorId) {
    const rows = await db
      .select({ id: message.id, createdAt: message.createdAt })
      .from(message)
      .where(and(eq(message.id, anchorId), eq(message.channelId, channelId)))
      .limit(1)
    anchor = rows[0] ?? null

    if (!anchor) {
      // Anchor doesn't exist in this channel — return empty result. The
      // frontend will surface a "message not found" state.
      return {
        data: [],
        beforeCursor: null,
        afterCursor: null,
        reachedOldest: true,
        reachedNewest: true,
      }
    }
  }

  let messages: BareMessageRow[] = []
  let reachedOldest = false
  let reachedNewest = false

  if (around && anchor) {
    const slots = limit - 1 // exclude the anchor itself
    const halfBefore = Math.floor(slots / 2)
    const halfAfter = Math.ceil(slots / 2)

    // Fetch limit+1 each side so a half running short can borrow slots.
    const [olderRows, newerRows, anchorRow] = await Promise.all([
      db
        .select(messageSelect)
        .from(message)
        .innerJoin(user, eq(message.authorId, user.id))
        .where(
          and(
            eq(message.channelId, channelId),
            or(
              lt(message.createdAt, anchor.createdAt),
              and(
                eq(message.createdAt, anchor.createdAt),
                lt(message.id, anchor.id)
              )
            )
          )
        )
        .orderBy(desc(message.createdAt), desc(message.id))
        .limit(limit + 1),
      db
        .select(messageSelect)
        .from(message)
        .innerJoin(user, eq(message.authorId, user.id))
        .where(
          and(
            eq(message.channelId, channelId),
            or(
              gt(message.createdAt, anchor.createdAt),
              and(
                eq(message.createdAt, anchor.createdAt),
                gt(message.id, anchor.id)
              )
            )
          )
        )
        .orderBy(asc(message.createdAt), asc(message.id))
        .limit(limit + 1),
      db
        .select(messageSelect)
        .from(message)
        .innerJoin(user, eq(message.authorId, user.id))
        .where(eq(message.id, anchor.id))
        .limit(1),
    ])

    // Donate unused slots from a short half to the other side.
    let useNewer = Math.min(halfAfter, newerRows.length)
    let useOlder = Math.min(halfBefore, olderRows.length)
    if (useNewer < halfAfter) {
      const surplus = halfAfter - useNewer
      useOlder = Math.min(
        useOlder + surplus,
        olderRows.length,
        slots - useNewer
      )
    } else if (useOlder < halfBefore) {
      const surplus = halfBefore - useOlder
      useNewer = Math.min(
        useNewer + surplus,
        newerRows.length,
        slots - useOlder
      )
    }

    reachedOldest = olderRows.length <= useOlder
    reachedNewest = newerRows.length <= useNewer

    // Newest-first: [newest...anchor...oldest]
    messages = [
      ...newerRows.slice(0, useNewer).reverse(),
      ...anchorRow,
      ...olderRows.slice(0, useOlder),
    ]
  } else if (before && anchor) {
    const rows = await db
      .select(messageSelect)
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(
        and(
          eq(message.channelId, channelId),
          or(
            lt(message.createdAt, anchor.createdAt),
            and(
              eq(message.createdAt, anchor.createdAt),
              lt(message.id, anchor.id)
            )
          )
        )
      )
      .orderBy(desc(message.createdAt), desc(message.id))
      .limit(limit + 1)

    reachedOldest = rows.length <= limit
    messages = rows.slice(0, limit)
    // We know there are newer messages — the anchor itself.
    reachedNewest = false
  } else if (after && anchor) {
    const rows = await db
      .select(messageSelect)
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(
        and(
          eq(message.channelId, channelId),
          or(
            gt(message.createdAt, anchor.createdAt),
            and(
              eq(message.createdAt, anchor.createdAt),
              gt(message.id, anchor.id)
            )
          )
        )
      )
      .orderBy(asc(message.createdAt), asc(message.id))
      .limit(limit + 1)

    reachedNewest = rows.length <= limit
    messages = rows.slice(0, limit).reverse() // back to newest-first
    reachedOldest = false
  } else {
    // No anchor — latest page.
    const rows = await db
      .select(messageSelect)
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(eq(message.channelId, channelId))
      .orderBy(desc(message.createdAt), desc(message.id))
      .limit(limit + 1)

    reachedOldest = rows.length <= limit
    reachedNewest = true
    messages = rows.slice(0, limit)
  }

  const messageIds = messages.map((msg) => msg.id)

  const [mentionRows, reactionRows, referencedMessageRows] = await Promise.all([
    messageIds.length > 0
      ? db
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
      : Promise.resolve([]),
    messageIds.length > 0
      ? db
          .select({
            messageId: messageReaction.messageId,
            emoji: messageReaction.emoji,
            userId: messageReaction.userId,
            userName: user.name,
          })
          .from(messageReaction)
          .innerJoin(user, eq(messageReaction.userId, user.id))
          .where(inArray(messageReaction.messageId, messageIds))
      : Promise.resolve([]),
    (async () => {
      const referencedMessageIds = messages
        .map((msg) => msg.referencedMessageId)
        .filter((id): id is string => id !== null)
      if (referencedMessageIds.length === 0) return []
      return db
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
    })(),
  ])

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
        reactors: Array<{ id: string; name: string }>
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
      reactors: [],
    }

    existingReaction.count += 1
    existingReaction.reactors.push({
      id: reactionRow.userId,
      name: reactionRow.userName,
    })
    if (reactionRow.userId === currentUserId) {
      existingReaction.reactedByCurrentUser = true
    }

    reactionsByEmoji.set(reactionRow.emoji, existingReaction)
    reactionsByMessageId.set(reactionRow.messageId, reactionsByEmoji)
  }

  const data = messages.map((msg) => ({
    ...msg,
    embeds: msg.embeds ?? [],
    mentions: mentionsByMessageId.get(msg.id) ?? [],
    reactions: Array.from(reactionsByMessageId.get(msg.id)?.values() ?? []),
    referencedMessage: msg.referencedMessageId
      ? (referencedMessagesById.get(msg.referencedMessageId) ?? null)
      : null,
  }))

  const afterCursor = data[0]?.id ?? null
  const beforeCursor = data[data.length - 1]?.id ?? null

  return {
    data,
    beforeCursor,
    afterCursor,
    reachedOldest,
    reachedNewest,
  }
}
