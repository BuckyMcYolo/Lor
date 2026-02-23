import { db, eq, schema } from "@repo/db"
import type { RealtimeMessage, SendMessagePayload } from "@repo/realtime-types"
import {
  type AccessibleChannel,
  assertUserCanAccessChannel,
} from "./channel-access"

type CreateMessageInput = {
  userId: string
  payload: SendMessagePayload
}

export type CreateMessageResult = {
  message: RealtimeMessage
  channel: AccessibleChannel
}

export async function createMessage(input: CreateMessageInput) {
  const channelRecord = await assertUserCanAccessChannel(
    input.userId,
    input.payload.channelId
  )

  const messageWithAuthor = await db.transaction(async (tx) => {
    const insertedMessage = await tx
      .insert(schema.message)
      .values({
        channelId: input.payload.channelId,
        authorId: input.userId,
        content: input.payload.content,
        type: "default",
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

  const createdMessage: RealtimeMessage = {
    id: messageWithAuthor.id,
    channelId: messageWithAuthor.channelId,
    content: messageWithAuthor.content,
    type: messageWithAuthor.type,
    createdAt: messageWithAuthor.createdAt.toISOString(),
    author: {
      id: messageWithAuthor.authorId,
      name: messageWithAuthor.authorName,
      username: messageWithAuthor.authorUsername,
      displayUsername: messageWithAuthor.authorDisplayUsername,
      image: messageWithAuthor.authorImage,
    },
  }

  if (input.payload.nonce) {
    createdMessage.nonce = input.payload.nonce
  }

  return {
    message: createdMessage,
    channel: channelRecord,
  } satisfies CreateMessageResult
}
