import { db } from "@repo/db"
import { message, user } from "@repo/db/schema"
import { count, desc, eq } from "drizzle-orm"

export async function fetchMessagePage(
  channelId: string,
  page: number,
  perPage: number
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

  return {
    itemsTotal,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    data: messages,
  }
}
