import { db } from "@repo/db"
import {
  channel,
  message,
  messageMention,
  messageReaction,
  user,
} from "@repo/db/schema"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { assertGuildPermission } from "@/lib/permissions"
import { fetchMessagePage } from "@/lib/queries/messages"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  CreateChannelRoute,
  DeleteChannelRoute,
  GetChannelRoute,
  ListChannelMessagesRoute,
  ListChannelsRoute,
  ListPinnedMessagesRoute,
  ReorderChannelsRoute,
  ToggleMessagePinRoute,
  UpdateChannelRoute,
} from "./routes"

export const listChannels: AppRouteHandler<ListChannelsRoute> = async (c) => {
  const guild = c.var.guild

  const channels = await db
    .select()
    .from(channel)
    .where(eq(channel.guildId, guild.id))
    .orderBy(asc(channel.position))

  const categoryMap = new Map<string, typeof channels>()
  const categories: typeof channels = []
  const uncategorized: typeof channels = []

  for (const ch of channels) {
    if (ch.type === "category") {
      categories.push(ch)
      categoryMap.set(ch.id, [])
    }
  }

  for (const ch of channels) {
    if (ch.type === "category") continue
    const parent = ch.parentId ? categoryMap.get(ch.parentId) : undefined
    if (parent) {
      parent.push(ch)
    } else {
      uncategorized.push(ch)
    }
  }

  return c.json(
    {
      uncategorized,
      categories: categories.map((cat) => ({
        ...cat,
        channels: categoryMap.get(cat.id) ?? [],
      })),
    },
    HttpStatusCodes.OK
  )
}

export const createChannel: AppRouteHandler<CreateChannelRoute> = async (c) => {
  const guild = c.var.guild
  const member = c.var.member
  const body = c.req.valid("json")

  assertGuildPermission(member, guild, {
    channel: ["create"],
  })

  const newChannel = await db
    .insert(channel)
    .values({
      ...body,
      guildId: guild.id,
    })
    .returning()
    .then((rows) => rows[0])

  if (!newChannel) {
    return c.json(
      { success: false, message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(newChannel, HttpStatusCodes.CREATED)
}

export const reorderChannels: AppRouteHandler<ReorderChannelsRoute> = async (
  c
) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channels: updates } = c.req.valid("json")

  assertGuildPermission(member, guild, {
    channel: ["update"],
  })

  const channelIds = updates.map((u) => u.id)
  const uniqueChannelIds = [...new Set(channelIds)]

  // Verify all channels belong to this guild
  const existing = await db
    .select({ id: channel.id })
    .from(channel)
    .where(
      and(eq(channel.guildId, guild.id), inArray(channel.id, uniqueChannelIds))
    )

  if (existing.length !== uniqueChannelIds.length) {
    return c.json(
      { success: false, message: "One or more channels not found in guild" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(channel)
        .set({ position: update.position, parentId: update.parentId })
        .where(and(eq(channel.id, update.id), eq(channel.guildId, guild.id)))
    }
  })

  return c.json({ success: true }, HttpStatusCodes.OK)
}

export const getChannel: AppRouteHandler<GetChannelRoute> = async (c) => {
  const guild = c.var.guild
  const { channelId } = c.req.valid("param")

  const ch = await db
    .select()
    .from(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .limit(1)
    .then((rows) => rows[0])

  if (!ch) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(ch, HttpStatusCodes.OK)
}

export const updateChannel: AppRouteHandler<UpdateChannelRoute> = async (c) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channelId } = c.req.valid("param")
  const body = c.req.valid("json")

  assertGuildPermission(member, guild, {
    channel: ["update"],
  })

  const updated = await db
    .update(channel)
    .set(body)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .returning()
    .then((rows) => rows[0])

  if (!updated) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(updated, HttpStatusCodes.OK)
}

export const deleteChannel: AppRouteHandler<DeleteChannelRoute> = async (c) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channelId } = c.req.valid("param")

  assertGuildPermission(member, guild, {
    channel: ["delete"],
  })

  const deleted = await db
    .delete(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .returning({ id: channel.id })
    .then((rows) => rows[0])

  if (!deleted) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json({ success: true }, HttpStatusCodes.OK)
}

export const listChannelMessages: AppRouteHandler<
  ListChannelMessagesRoute
> = async (c) => {
  const guild = c.var.guild
  const currentUser = c.var.user
  const { channelId } = c.req.valid("param")
  const { page, perPage } = c.req.valid("query")

  // Verify channel belongs to this guild
  const ch = await db
    .select({ id: channel.id })
    .from(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .limit(1)
    .then((rows) => rows[0])

  if (!ch) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(
    await fetchMessagePage(channelId, page, perPage, currentUser.id),
    HttpStatusCodes.OK
  )
}

export const toggleMessagePin: AppRouteHandler<ToggleMessagePinRoute> = async (
  c
) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channelId, messageId } = c.req.valid("param")

  assertGuildPermission(member, guild, {
    message: ["pin"],
  })

  // Verify message exists in this channel and guild
  const msg = await db
    .select({
      id: message.id,
      pinned: message.pinned,
      channelId: message.channelId,
    })
    .from(message)
    .innerJoin(channel, eq(message.channelId, channel.id))
    .where(
      and(
        eq(message.id, messageId),
        eq(message.channelId, channelId),
        eq(channel.guildId, guild.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!msg) {
    return c.json(
      { success: false, message: "Message not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const newPinned = !msg.pinned

  await db
    .update(message)
    .set({ pinned: newPinned })
    .where(eq(message.id, messageId))

  return c.json(
    { success: true as const, pinned: newPinned },
    HttpStatusCodes.OK
  )
}

export const listPinnedMessages: AppRouteHandler<
  ListPinnedMessagesRoute
> = async (c) => {
  const guild = c.var.guild
  const currentUser = c.var.user
  const { channelId } = c.req.valid("param")

  // Verify channel belongs to guild
  const ch = await db
    .select({ id: channel.id })
    .from(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .limit(1)
    .then((rows) => rows[0])

  if (!ch) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const messages = await db
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
    .where(and(eq(message.channelId, channelId), eq(message.pinned, true)))
    .orderBy(desc(message.createdAt))

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
            userName: user.name,
          })
          .from(messageReaction)
          .innerJoin(user, eq(messageReaction.userId, user.id))
          .where(inArray(messageReaction.messageId, messageIds))
      : []

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

  const mentionsByMessageId = new Map<string, typeof mentionRows>()
  for (const row of mentionRows) {
    const existing = mentionsByMessageId.get(row.messageId) ?? []
    existing.push(row)
    mentionsByMessageId.set(row.messageId, existing)
  }

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
  for (const row of reactionRows) {
    const reactionsByEmoji =
      reactionsByMessageId.get(row.messageId) ?? new Map()
    const existing = reactionsByEmoji.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      reactedByCurrentUser: false,
      reactors: [],
    }
    existing.count += 1
    existing.reactors.push({ id: row.userId, name: row.userName })
    if (row.userId === currentUser.id) {
      existing.reactedByCurrentUser = true
    }
    reactionsByEmoji.set(row.emoji, existing)
    reactionsByMessageId.set(row.messageId, reactionsByEmoji)
  }

  const data = messages.map((msg) => ({
    ...msg,
    embeds: msg.embeds ?? [],
    mentions: (mentionsByMessageId.get(msg.id) ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      username: m.username,
      displayUsername: m.displayUsername,
      image: m.image,
    })),
    reactions: Array.from(reactionsByMessageId.get(msg.id)?.values() ?? []),
    referencedMessage: msg.referencedMessageId
      ? (referencedMessagesById.get(msg.referencedMessageId) ?? null)
      : null,
  }))

  return c.json({ data }, HttpStatusCodes.OK)
}
