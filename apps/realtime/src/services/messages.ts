import { db, eq, schema } from "@repo/db"
import type { RealtimeMessage } from "@/lib/events"
import { sendMessagePayloadSchema } from "@/lib/events"
import { assertUserCanAccessChannel } from "./channel-access"

type CreateMessageInput = {
  userId: string
  channelId: string
  content: string
  nonce?: string
}

export async function createMessage(input: CreateMessageInput) {
  const parsed = sendMessagePayloadSchema.parse({
    channelId: input.channelId,
    content: input.content,
    nonce: input.nonce,
  })

  await assertUserCanAccessChannel(input.userId, parsed.channelId)

  const insertedMessage = await db
    .insert(schema.message)
    .values({
      channelId: parsed.channelId,
      authorId: input.userId,
      content: parsed.content,
      type: "default",
    })
    .returning({
      id: schema.message.id,
    })
    .then((rows) => rows[0])

  if (!insertedMessage) {
    throw new Error("Failed to create message")
  }

  await db
    .update(schema.channel)
    .set({ updatedAt: new Date() })
    .where(eq(schema.channel.id, parsed.channelId))

  const messageWithAuthor = await db
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

  if (!messageWithAuthor) {
    throw new Error("Failed to fetch created message")
  }

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

  if (parsed.nonce) {
    createdMessage.nonce = parsed.nonce
  }

  return createdMessage
}
