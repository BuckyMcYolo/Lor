import { db } from "@repo/db"
import type { Attachment } from "@repo/db/schema"
import {
  channelReadState,
  message,
  messageMention,
  user,
} from "@repo/db/schema"
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  max,
  ne,
} from "drizzle-orm"

export type ThreadActivityMention = {
  id: string
  name: string
  username: string | null
  displayUsername: string | null
  image: string | null
}

export type ThreadActivityItem = {
  threadRootId: string
  replyCount: number
  lastReplyAt: string
  participants: Array<{
    id: string
    name: string
    displayUsername: string | null
    image: string | null
  }>
  lastReply: {
    content: string | null
    author: {
      id: string
      name: string
      username: string | null
      displayUsername: string | null
      image: string | null
    }
    hasAttachments: boolean
    mentions: ThreadActivityMention[]
  }
}

type FetchParams = {
  channelId: string
  currentUserId: string
  limit?: number
}

/**
 * Threads in a channel that have received replies from someone other than the
 * caller since the caller last read the channel. Powers the "thread activity"
 * cards surfaced at the bottom of the feed when you return to a channel.
 */
export async function fetchChannelThreadActivity({
  channelId,
  currentUserId,
  limit = 5,
}: FetchParams): Promise<ThreadActivityItem[]> {
  const readRows = await db
    .select({ lastReadAt: channelReadState.lastReadAt })
    .from(channelReadState)
    .where(
      and(
        eq(channelReadState.channelId, channelId),
        eq(channelReadState.userId, currentUserId)
      )
    )
    .limit(1)
  const lastReadAt = readRows[0]?.lastReadAt ?? null

  // Roots with a reply from someone else since we last read the channel.
  const freshRootRows = await db
    .selectDistinct({ threadRootId: message.threadRootId })
    .from(message)
    .where(
      and(
        eq(message.channelId, channelId),
        isNotNull(message.threadRootId),
        ne(message.authorId, currentUserId),
        lastReadAt ? gt(message.createdAt, lastReadAt) : undefined
      )
    )
  const rootIds = freshRootRows
    .map((r) => r.threadRootId)
    .filter((id): id is string => id !== null)
  if (rootIds.length === 0) return []

  const [summaryRows, replyRows] = await Promise.all([
    db
      .select({
        threadRootId: message.threadRootId,
        replyCount: count(),
        lastReplyAt: max(message.createdAt),
      })
      .from(message)
      .where(inArray(message.threadRootId, rootIds))
      .groupBy(message.threadRootId),
    // Newest-first; the first row per root is its latest reply, and the
    // distinct authors give participants.
    db
      .select({
        threadRootId: message.threadRootId,
        messageId: message.id,
        content: message.content,
        attachments: message.attachments,
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorDisplayUsername: user.displayUsername,
        authorImage: user.image,
      })
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(inArray(message.threadRootId, rootIds))
      .orderBy(desc(message.createdAt)),
  ])

  type ReplyRow = (typeof replyRows)[number]
  const latestReplyByRoot = new Map<string, ReplyRow>()
  const participantsByRoot = new Map<
    string,
    ThreadActivityItem["participants"]
  >()
  const seenAuthorsPerRoot = new Map<string, Set<string>>()
  for (const row of replyRows) {
    if (!row.threadRootId) continue
    if (!latestReplyByRoot.has(row.threadRootId)) {
      latestReplyByRoot.set(row.threadRootId, row)
    }
    const list = participantsByRoot.get(row.threadRootId) ?? []
    if (list.length >= 3) continue
    let seen = seenAuthorsPerRoot.get(row.threadRootId)
    if (!seen) {
      seen = new Set()
      seenAuthorsPerRoot.set(row.threadRootId, seen)
    }
    if (seen.has(row.authorId)) continue
    seen.add(row.authorId)
    list.push({
      id: row.authorId,
      name: row.authorName,
      displayUsername: row.authorDisplayUsername,
      image: row.authorImage,
    })
    participantsByRoot.set(row.threadRootId, list)
  }

  // Mentions for the newest reply of each root, so @mentions render as names.
  const latestReplyIds = Array.from(latestReplyByRoot.values()).map(
    (r) => r.messageId
  )
  const mentionRows = latestReplyIds.length
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
            inArray(messageMention.messageId, latestReplyIds),
            eq(messageMention.mentionType, "direct")
          )
        )
    : []
  const mentionsByMessageId = new Map<string, ThreadActivityMention[]>()
  for (const row of mentionRows) {
    const list = mentionsByMessageId.get(row.messageId) ?? []
    list.push({
      id: row.id,
      name: row.name,
      username: row.username,
      displayUsername: row.displayUsername,
      image: row.image,
    })
    mentionsByMessageId.set(row.messageId, list)
  }

  const items: ThreadActivityItem[] = []
  for (const row of summaryRows) {
    if (!row.threadRootId || !row.lastReplyAt) continue
    const latest = latestReplyByRoot.get(row.threadRootId)
    if (!latest) continue
    const attachments = (latest.attachments as Attachment[] | null) ?? []
    items.push({
      threadRootId: row.threadRootId,
      replyCount: Number(row.replyCount),
      lastReplyAt: row.lastReplyAt.toISOString(),
      participants: participantsByRoot.get(row.threadRootId) ?? [],
      lastReply: {
        content: latest.content,
        author: {
          id: latest.authorId,
          name: latest.authorName,
          username: latest.authorUsername,
          displayUsername: latest.authorDisplayUsername,
          image: latest.authorImage,
        },
        hasAttachments: attachments.length > 0,
        mentions: mentionsByMessageId.get(latest.messageId) ?? [],
      },
    })
  }

  // Freshest last — matches the bottom-of-feed stack ordering on the client.
  items.sort((a, b) => a.lastReplyAt.localeCompare(b.lastReplyAt))
  return items.slice(-limit)
}
