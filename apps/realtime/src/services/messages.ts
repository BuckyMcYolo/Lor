import { and, count, db, desc, eq, max, schema } from "@repo/db"
import type {
  DeleteMessagePayload,
  EditMessagePayload,
  RealtimeMessage,
  RealtimeMessageReactionUpdated,
  RealtimeMessageThreadUpdated,
  SendMessagePayload,
  ToggleMessageReactionPayload,
} from "@repo/realtime-types"
import {
  type AccessibleChannel,
  assertUserCanAccessChannel,
} from "./channel-access"

type CreateMessageInput = {
  userId: string
  payload: SendMessagePayload
  accessibleChannel: AccessibleChannel
}

type DeleteMessageInput = {
  userId: string
  payload: DeleteMessagePayload
}

type EditMessageInput = {
  userId: string
  payload: EditMessagePayload
}

type ToggleMessageReactionInput = {
  userId: string
  userName: string
  payload: ToggleMessageReactionPayload
}

export type CreateMessageResult = {
  message: RealtimeMessage
  channel: AccessibleChannel
}

export type DeleteMessageResult = {
  channelId: string
  messageId: string
  threadRootId: string | null
  channel: AccessibleChannel
}

export type ToggleMessageReactionResult = {
  update: RealtimeMessageReactionUpdated
  channel: AccessibleChannel
}

export async function createMessage(input: CreateMessageInput) {
  if (input.accessibleChannel.id !== input.payload.channelId) {
    throw new Error("Channel mismatch")
  }

  const channelRecord = input.accessibleChannel

  let hasReply = !!input.payload.referencedMessageId
  const threadRootId: string | null = input.payload.threadRootId ?? null

  const messageWithAuthor = await db.transaction(async (tx) => {
    // Verify the referenced message exists in the same channel AND in the
    // same thread context (or both at channel level). Prevents a thread
    // reply from quoting a message in a different thread.
    if (hasReply && input.payload.referencedMessageId) {
      const ref = await tx
        .select({
          id: schema.message.id,
          threadRootId: schema.message.threadRootId,
        })
        .from(schema.message)
        .where(
          and(
            eq(schema.message.id, input.payload.referencedMessageId),
            eq(schema.message.channelId, input.payload.channelId)
          )
        )
        .limit(1)
        .then((rows) => rows[0])

      if (!ref) {
        hasReply = false
      } else {
        // Both must share the same effective thread scope (null === channel).
        // A thread reply can only quote messages from the same thread root;
        // a channel-level send can only quote channel-level messages.
        const refRoot = ref.threadRootId ?? ref.id
        if (threadRootId) {
          if (refRoot !== threadRootId) hasReply = false
        } else if (ref.threadRootId !== null) {
          hasReply = false
        }
      }
    }

    // Verify the thread root exists, is in this channel, and is itself a
    // channel-level message (threads are flat — replies can't host nested threads).
    if (threadRootId) {
      const root = await tx
        .select({
          id: schema.message.id,
          threadRootId: schema.message.threadRootId,
        })
        .from(schema.message)
        .where(
          and(
            eq(schema.message.id, threadRootId),
            eq(schema.message.channelId, input.payload.channelId)
          )
        )
        .limit(1)
        .then((rows) => rows[0])

      if (!root || root.threadRootId !== null) {
        throw new Error("Invalid thread root")
      }
    }

    const insertedMessage = await tx
      .insert(schema.message)
      .values({
        channelId: input.payload.channelId,
        authorId: input.userId,
        content: input.payload.content ?? null,
        type: hasReply ? "reply" : "default",
        referencedMessageId: hasReply
          ? (input.payload.referencedMessageId ?? null)
          : null,
        threadRootId,
        attachments: input.payload.attachments ?? [],
      })
      .returning({
        id: schema.message.id,
      })
      .then((rows) => rows[0])

    if (!insertedMessage) {
      throw new Error("Failed to create message")
    }

    await tx
      .update(schema.channel)
      .set({ updatedAt: new Date() })
      .where(eq(schema.channel.id, input.payload.channelId))

    const createdMessageWithAuthor = await tx
      .select({
        id: schema.message.id,
        channelId: schema.message.channelId,
        content: schema.message.content,
        type: schema.message.type,
        createdAt: schema.message.createdAt,
        authorId: schema.user.id,
        authorName: schema.user.name,
        authorUsername: schema.user.username,
        authorDisplayUsername: schema.user.displayUsername,
        authorImage: schema.user.image,
      })
      .from(schema.message)
      .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
      .where(eq(schema.message.id, insertedMessage.id))
      .limit(1)
      .then((rows) => rows[0])

    if (!createdMessageWithAuthor) {
      throw new Error("Failed to fetch created message")
    }

    return createdMessageWithAuthor
  })

  let referencedMessage: RealtimeMessage["referencedMessage"] = null
  if (hasReply && input.payload.referencedMessageId) {
    const refMsg = await db
      .select({
        id: schema.message.id,
        content: schema.message.content,
        authorId: schema.user.id,
        authorName: schema.user.name,
        authorUsername: schema.user.username,
        authorDisplayUsername: schema.user.displayUsername,
        authorImage: schema.user.image,
      })
      .from(schema.message)
      .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
      .where(eq(schema.message.id, input.payload.referencedMessageId))
      .limit(1)
      .then((rows) => rows[0])

    if (refMsg) {
      referencedMessage = {
        id: refMsg.id,
        content: refMsg.content,
        author: {
          id: refMsg.authorId,
          name: refMsg.authorName,
          username: refMsg.authorUsername,
          displayUsername: refMsg.authorDisplayUsername,
          image: refMsg.authorImage,
        },
      }
    }
  }

  const createdMessage: RealtimeMessage = {
    id: messageWithAuthor.id,
    channelId: messageWithAuthor.channelId,
    content: messageWithAuthor.content,
    type: messageWithAuthor.type,
    pinned: false,
    createdAt: messageWithAuthor.createdAt.toISOString(),
    author: {
      id: messageWithAuthor.authorId,
      name: messageWithAuthor.authorName,
      username: messageWithAuthor.authorUsername,
      displayUsername: messageWithAuthor.authorDisplayUsername,
      image: messageWithAuthor.authorImage,
    },
    mentions: [],
    reactions: [],
    attachments: input.payload.attachments ?? [],
    embeds: [],
    referencedMessage,
    threadRootId,
  }

  if (input.payload.nonce) {
    createdMessage.nonce = input.payload.nonce
  }

  return {
    message: createdMessage,
    channel: channelRecord,
  } satisfies CreateMessageResult
}

export async function loadThreadSummary(
  channelId: string,
  threadRootId: string
): Promise<RealtimeMessageThreadUpdated | null> {
  const summary = await db
    .select({
      replyCount: count(),
      lastReplyAt: max(schema.message.createdAt),
    })
    .from(schema.message)
    .where(eq(schema.message.threadRootId, threadRootId))
    .then((rows) => rows[0])

  if (!summary || !summary.lastReplyAt) return null

  const recentReplies = await db
    .select({
      authorId: schema.message.authorId,
      userName: schema.user.name,
      userDisplayUsername: schema.user.displayUsername,
      userImage: schema.user.image,
    })
    .from(schema.message)
    .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
    .where(eq(schema.message.threadRootId, threadRootId))
    .orderBy(desc(schema.message.createdAt))
    .limit(20)

  const seen = new Set<string>()
  const participants: RealtimeMessageThreadUpdated["participants"] = []
  for (const row of recentReplies) {
    if (seen.has(row.authorId)) continue
    seen.add(row.authorId)
    participants.push({
      id: row.authorId,
      name: row.userName,
      displayUsername: row.userDisplayUsername,
      image: row.userImage,
    })
    if (participants.length >= 3) break
  }

  return {
    channelId,
    threadRootId,
    replyCount: Number(summary.replyCount),
    lastReplyAt: summary.lastReplyAt.toISOString(),
    participants,
  }
}

export async function deleteMessage(
  input: DeleteMessageInput
): Promise<DeleteMessageResult> {
  const channelRecord = await assertUserCanAccessChannel(
    input.userId,
    input.payload.channelId
  )

  const messageRecord = await db
    .select({
      id: schema.message.id,
      authorId: schema.message.authorId,
      threadRootId: schema.message.threadRootId,
    })
    .from(schema.message)
    .where(
      and(
        eq(schema.message.id, input.payload.messageId),
        eq(schema.message.channelId, input.payload.channelId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!messageRecord) {
    throw new Error("Message not found")
  }

  if (messageRecord.authorId !== input.userId) {
    throw new Error("You can only delete your own messages")
  }

  await db
    .delete(schema.message)
    .where(eq(schema.message.id, input.payload.messageId))

  return {
    channelId: input.payload.channelId,
    messageId: input.payload.messageId,
    threadRootId: messageRecord.threadRootId,
    channel: channelRecord,
  }
}

export type EditMessageResult = {
  channelId: string
  messageId: string
  content: string
  editedAt: string
  channel: AccessibleChannel
}

export async function editMessage(
  input: EditMessageInput
): Promise<EditMessageResult> {
  const channelRecord = await assertUserCanAccessChannel(
    input.userId,
    input.payload.channelId
  )

  const messageRecord = await db
    .select({
      id: schema.message.id,
      authorId: schema.message.authorId,
    })
    .from(schema.message)
    .where(
      and(
        eq(schema.message.id, input.payload.messageId),
        eq(schema.message.channelId, input.payload.channelId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!messageRecord) {
    throw new Error("Message not found")
  }

  if (messageRecord.authorId !== input.userId) {
    throw new Error("You can only edit your own messages")
  }

  const editedAt = new Date()

  await db
    .update(schema.message)
    .set({ content: input.payload.content, editedAt })
    .where(eq(schema.message.id, input.payload.messageId))

  return {
    channelId: input.payload.channelId,
    messageId: input.payload.messageId,
    content: input.payload.content,
    editedAt: editedAt.toISOString(),
    channel: channelRecord,
  }
}

export async function toggleMessageReaction(input: ToggleMessageReactionInput) {
  const channelRecord = await assertUserCanAccessChannel(
    input.userId,
    input.payload.channelId
  )

  const messageRecord = await db
    .select({
      id: schema.message.id,
    })
    .from(schema.message)
    .where(
      and(
        eq(schema.message.id, input.payload.messageId),
        eq(schema.message.channelId, input.payload.channelId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!messageRecord) {
    throw new Error("Message not found")
  }

  const nextReactionState = await db.transaction(async (tx) => {
    const existingReaction = await tx
      .select({ id: schema.messageReaction.id })
      .from(schema.messageReaction)
      .where(
        and(
          eq(schema.messageReaction.messageId, input.payload.messageId),
          eq(schema.messageReaction.userId, input.userId),
          eq(schema.messageReaction.emoji, input.payload.emoji)
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (existingReaction) {
      await tx
        .delete(schema.messageReaction)
        .where(eq(schema.messageReaction.id, existingReaction.id))
      return false
    }

    await tx.insert(schema.messageReaction).values({
      messageId: input.payload.messageId,
      userId: input.userId,
      emoji: input.payload.emoji,
    })
    return true
  })

  const reactionCount = await db
    .select({ total: count() })
    .from(schema.messageReaction)
    .where(
      and(
        eq(schema.messageReaction.messageId, input.payload.messageId),
        eq(schema.messageReaction.emoji, input.payload.emoji)
      )
    )
    .limit(1)
    .then((rows) => rows[0]?.total ?? 0)

  return {
    update: {
      channelId: input.payload.channelId,
      messageId: input.payload.messageId,
      emoji: input.payload.emoji,
      count: reactionCount,
      actorUserId: input.userId,
      actorName: input.userName,
      reactedByActor: nextReactionState,
    },
    channel: channelRecord,
  } satisfies ToggleMessageReactionResult
}
