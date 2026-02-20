import { db } from "@repo/db"
import { channel, channelMember, message, user } from "@repo/db/schema"
import { and, count, desc, eq, inArray, ne } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { fetchMessagePage } from "@/lib/queries/messages"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { GetDMRoute, ListDMMessagesRoute, ListDMsRoute } from "./routes"

const emptyPage = (page: number) => ({
  itemsTotal: 0,
  currentPage: page,
  nextPage: null,
  prevPage: null,
  data: [],
})

const DM_CHANNEL_TYPES = ["dm", "group_dm"] as const

async function fetchDMMembershipChannel(dmId: string, userId: string) {
  return db
    .select({
      id: channel.id,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      name: channel.name,
      topic: channel.topic,
      type: channel.type,
      guildId: channel.guildId,
      parentId: channel.parentId,
      position: channel.position,
      ownerId: channel.ownerId,
      rateLimitPerUser: channel.rateLimitPerUser,
    })
    .from(channel)
    .innerJoin(channelMember, eq(channelMember.channelId, channel.id))
    .where(
      and(
        eq(channel.id, dmId),
        eq(channelMember.userId, userId),
        inArray(channel.type, DM_CHANNEL_TYPES)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export const listDMs: AppRouteHandler<ListDMsRoute> = async (c) => {
  const currentUser = c.var.user
  const { page, perPage } = c.req.valid("query")
  const offset = (page - 1) * perPage

  const dmFilter = and(
    eq(channelMember.userId, currentUser.id),
    inArray(channel.type, ["dm", "group_dm"])
  )

  // Query 1: Count + fetch paginated DM channels
  const [countResult, dmChannels] = await Promise.all([
    db
      .select({ total: count() })
      .from(channel)
      .innerJoin(channelMember, eq(channelMember.channelId, channel.id))
      .where(dmFilter),
    db
      .select({
        id: channel.id,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        name: channel.name,
        topic: channel.topic,
        type: channel.type,
        guildId: channel.guildId,
        parentId: channel.parentId,
        position: channel.position,
        ownerId: channel.ownerId,
        rateLimitPerUser: channel.rateLimitPerUser,
      })
      .from(channel)
      .innerJoin(channelMember, eq(channelMember.channelId, channel.id))
      .where(dmFilter)
      .orderBy(desc(channel.updatedAt))
      .limit(perPage)
      .offset(offset),
  ])

  const itemsTotal = countResult[0]?.total ?? 0

  if (dmChannels.length === 0) {
    return c.json(emptyPage(page), HttpStatusCodes.OK)
  }

  // Query 2: Latest message + author for this page's channels
  // Uses DISTINCT ON to get one row per channel (the most recent message)
  const dmChannelIds = dmChannels.map((ch) => ch.id)

  const latestMessages = await db
    .select({
      channelId: message.channelId,
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorUsername: user.username,
      authorDisplayUsername: user.displayUsername,
      authorImage: user.image,
    })
    .from(message)
    .innerJoin(user, eq(message.authorId, user.id))
    .where(inArray(message.channelId, dmChannelIds))
    .orderBy(message.channelId, desc(message.createdAt))
    .then((rows) => {
      // Keep only the first (most recent) message per channel
      const seen = new Set<string>()
      return rows.filter((row) => {
        if (seen.has(row.channelId)) return false
        seen.add(row.channelId)
        return true
      })
    })

  const lastMessageByChannel = new Map(
    latestMessages.map((msg) => [
      msg.channelId,
      {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        author: {
          id: msg.authorId,
          name: msg.authorName,
          username: msg.authorUsername,
          displayUsername: msg.authorDisplayUsername,
          image: msg.authorImage,
        },
      },
    ])
  )

  // Query 3: Members for each DM channel (excluding the current user)
  const members = await db
    .select({
      channelId: channelMember.channelId,
      id: user.id,
      name: user.name,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
    })
    .from(channelMember)
    .innerJoin(user, eq(channelMember.userId, user.id))
    .where(
      and(
        inArray(channelMember.channelId, dmChannelIds),
        ne(channelMember.userId, currentUser.id)
      )
    )

  const membersByChannel = new Map<
    string,
    {
      id: string
      name: string
      username: string | null
      displayUsername: string | null
      image: string | null
    }[]
  >()
  for (const m of members) {
    const list = membersByChannel.get(m.channelId) ?? []
    list.push({
      id: m.id,
      name: m.name,
      username: m.username,
      displayUsername: m.displayUsername,
      image: m.image,
    })
    membersByChannel.set(m.channelId, list)
  }

  const totalPages = Math.ceil(itemsTotal / perPage)

  const data = dmChannels.map((ch) => ({
    ...ch,
    members: membersByChannel.get(ch.id) ?? [],
    lastMessage: lastMessageByChannel.get(ch.id) ?? null,
  }))

  return c.json(
    {
      itemsTotal,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      data,
    },
    HttpStatusCodes.OK
  )
}

export const getDM: AppRouteHandler<GetDMRoute> = async (c) => {
  const currentUser = c.var.user
  const { dmId } = c.req.valid("param")

  // Verify the channel exists and the user is a member.
  const ch = await fetchDMMembershipChannel(dmId, currentUser.id)

  if (!ch) {
    return c.json(
      { success: false, message: "DM not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const [members, latestMessages] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        displayUsername: user.displayUsername,
        image: user.image,
      })
      .from(channelMember)
      .innerJoin(user, eq(channelMember.userId, user.id))
      .where(
        and(
          eq(channelMember.channelId, ch.id),
          ne(channelMember.userId, currentUser.id)
        )
      ),
    db
      .select({
        channelId: message.channelId,
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorDisplayUsername: user.displayUsername,
        authorImage: user.image,
      })
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(eq(message.channelId, ch.id))
      .orderBy(desc(message.createdAt))
      .limit(1),
  ])

  const lastMessageRow = latestMessages[0]
  const lastMessage = lastMessageRow
    ? {
        id: lastMessageRow.id,
        content: lastMessageRow.content,
        createdAt: lastMessageRow.createdAt.toISOString(),
        author: {
          id: lastMessageRow.authorId,
          name: lastMessageRow.authorName,
          username: lastMessageRow.authorUsername,
          displayUsername: lastMessageRow.authorDisplayUsername,
          image: lastMessageRow.authorImage,
        },
      }
    : null

  return c.json(
    {
      ...ch,
      members,
      lastMessage,
    },
    HttpStatusCodes.OK
  )
}

export const listDMMessages: AppRouteHandler<ListDMMessagesRoute> = async (
  c
) => {
  const currentUser = c.var.user
  const { dmId } = c.req.valid("param")
  const { page, perPage } = c.req.valid("query")

  // Verify the channel exists and the user is a member.
  const ch = await fetchDMMembershipChannel(dmId, currentUser.id)

  if (!ch) {
    return c.json(
      { success: false, message: "DM not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(
    await fetchMessagePage(ch.id, page, perPage),
    HttpStatusCodes.OK
  )
}
